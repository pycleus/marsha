"""Define the structure of our API responses with Django Rest Framework serializers."""
from datetime import timedelta
import re
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

from botocore.signers import CloudFrontSigner
from rest_framework import serializers
from rest_framework_simplejwt.models import TokenUser

from .defaults import ERROR, PROCESSING, READY, STATE_CHOICES
from .models import Thumbnail, TimedTextTrack, Video
from .utils import cloudfront_utils, time_utils


UUID_REGEX = (
    "[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}"
)
# This regex matches keys in AWS for videos or timed text tracks
TIMED_TEXT_EXTENSIONS = "|".join(m[0] for m in TimedTextTrack.MODE_CHOICES)
KEY_PATTERN = (
    "^{uuid:s}/(?P<model_name>video|thumbnail|timedtexttrack)/(?P<object_id>"
    "{uuid:s})/(?P<stamp>[0-9]{{10}})(_[a-z-]{{2,10}}_({tt_ex}))?$"
).format(uuid=UUID_REGEX, tt_ex=TIMED_TEXT_EXTENSIONS)
KEY_REGEX = re.compile(KEY_PATTERN)


class TimestampField(serializers.DateTimeField):
    """A serializer field to serialize/deserialize a datetime to a Unix timestamp."""

    def to_representation(self, value):
        """Convert a datetime value to a Unix timestamp.

        Parameters
        ----------
        value: Type[datetime.datetime]
            The datetime value to convert

        Returns
        -------
        integer or `None`
            Unix timestamp for the datetime value or `None`

        """
        return time_utils.to_timestamp(value) if value else None

    def to_internal_value(self, value):
        """Convert a Unix timestamp value to a timezone aware datetime.

        Parameters
        ----------
        value: Type[string|integer]
            The Unix timestamp to convert

        Returns
        -------
        datetime.datetime or `None`
            datetime instance corresponding to the Unix timestamp or `None`

        Raises
        ------
        ValidationError
            when the value passed in argument is not a valid timestamp

        """
        try:
            return super(TimestampField, self).to_internal_value(
                time_utils.to_datetime(value)
            )
        except OverflowError as error:
            raise ValidationError(error)


class TimedTextTrackSerializer(serializers.ModelSerializer):
    """Serializer to display a timed text track model."""

    class Meta:  # noqa
        model = TimedTextTrack
        fields = (
            "active_stamp",
            "id",
            "is_ready_to_play",
            "mode",
            "language",
            "upload_state",
            "url",
            "video",
        )
        read_only_fields = (
            "id",
            "active_stamp",
            "is_ready_to_play",
            "upload_state",
            "url",
            "video",
        )

    active_stamp = TimestampField(
        source="uploaded_on", required=False, allow_null=True, read_only=True
    )
    url = serializers.SerializerMethodField()
    # Make sure video UUID is converted to a string during serialization
    video = serializers.PrimaryKeyRelatedField(
        read_only=True, pk_field=serializers.CharField()
    )
    is_ready_to_play = serializers.BooleanField(read_only=True)

    def create(self, validated_data):
        """Force the video field to the video of the JWT Token if any.

        Parameters
        ----------
        validated_data : dictionary
            Dictionary of the deserialized values of each field after validation.

        Returns
        -------
        dictionary
            The "validated_data" dictionary is returned after modification.

        """
        # user here is a video as it comes from the JWT
        # It is named "user" by convention in the `rest_framework_simplejwt` dependency we use.
        user = self.context["request"].user
        if not validated_data.get("video_id") and isinstance(user, TokenUser):
            validated_data["video_id"] = user.id
        return super().create(validated_data)

    def get_url(self, obj):
        """Url of the timed text track, signed with a CloudFront key if activated.

        Parameters
        ----------
        obj : Type[models.TimedTextTrack]
            The timed text track that we want to serialize

        Returns
        -------
        string or None
            The url for the timed text track converted to vtt.
            None if the timed text track is still not uploaded to S3 with success.

        """
        if obj.uploaded_on:

            base = "{protocol:s}://{cloudfront:s}/{video!s}".format(
                protocol=settings.AWS_S3_URL_PROTOCOL,
                cloudfront=settings.CLOUDFRONT_DOMAIN,
                video=obj.video.pk,
            )
            url = "{base:s}/timedtext/{stamp:s}_{language:s}{mode:s}.vtt".format(
                base=base,
                stamp=time_utils.to_timestamp(obj.uploaded_on),
                language=obj.language,
                mode="_{:s}".format(obj.mode) if obj.mode else "",
            )

            # Sign the url only if the functionality is activated
            if settings.CLOUDFRONT_SIGNED_URLS_ACTIVE:
                date_less_than = timezone.now() + timedelta(
                    seconds=settings.CLOUDFRONT_SIGNED_URLS_VALIDITY
                )
                cloudfront_signer = CloudFrontSigner(
                    settings.CLOUDFRONT_ACCESS_KEY_ID, cloudfront_utils.rsa_signer
                )
                url = cloudfront_signer.generate_presigned_url(
                    url, date_less_than=date_less_than
                )
            return url
        return None


class ThumbnailSerializer(serializers.ModelSerializer):
    """Serializer to display a thumbnail."""

    class Meta:  # noqa
        model = Thumbnail
        fields = (
            "active_stamp",
            "id",
            "is_ready_to_display",
            "upload_state",
            "urls",
            "video",
        )
        read_only_fields = (
            "active_stamp",
            "id",
            "is_ready_to_display",
            "upload_state",
            "urls",
            "video",
        )

    active_stamp = TimestampField(
        source="uploaded_on", required=False, allow_null=True, read_only=True
    )
    video = serializers.PrimaryKeyRelatedField(
        read_only=True, pk_field=serializers.CharField()
    )
    is_ready_to_display = serializers.BooleanField(read_only=True)
    urls = serializers.SerializerMethodField()

    def create(self, validated_data):
        """Force the video field to the video of the JWT Token if any.

        Parameters
        ----------
        validated_data : dictionary
            Dictionary of the deserialized values of each field after validation.

        Returns
        -------
        dictionary
            The "validated_data" dictionary is returned after modification.

        """
        # user here is a video as it comes from the JWT
        # It is named "user" by convention in the `rest_framework_simplejwt` dependency we use.
        user = self.context["request"].user
        if not validated_data.get("video_id") and isinstance(user, TokenUser):
            validated_data["video_id"] = user.id
        return super().create(validated_data)

    def get_urls(self, obj):
        """Urls of the thumbnail.

        Parameters
        ----------
        obj : Type[models.Thumbnail]
            The thumbnail that we want to serialize

        Returns
        -------
        Dict or None
            The urls for the thumbnail.
            None if the thumbnail is still not uploaded to S3 with success.

        """
        if obj.uploaded_on:
            base = "{protocol:s}://{cloudfront:s}/{video!s}".format(
                protocol=settings.AWS_S3_URL_PROTOCOL,
                cloudfront=settings.CLOUDFRONT_DOMAIN,
                video=obj.video.pk,
            )
            urls = {}
            for resolution in settings.VIDEO_RESOLUTIONS:
                urls[
                    resolution
                ] = "{base:s}/thumbnails/{stamp:s}_{resolution:d}.jpg".format(
                    base=base,
                    stamp=time_utils.to_timestamp(obj.uploaded_on),
                    resolution=resolution,
                )
            return urls
        return None


class VideoSerializer(serializers.ModelSerializer):
    """Serializer to display a video model with all its resolution options."""

    class Meta:  # noqa
        model = Video
        fields = (
            "active_stamp",
            "description",
            "id",
            "is_ready_to_play",
            "timed_text_tracks",
            "thumbnail",
            "title",
            "upload_state",
            "urls",
            "show_download",
        )
        read_only_fields = (
            "id",
            "active_stamp",
            "is_ready_to_play",
            "upload_state",
            "urls",
        )

    active_stamp = TimestampField(
        source="uploaded_on", required=False, allow_null=True, read_only=True
    )
    timed_text_tracks = TimedTextTrackSerializer(
        source="timedtexttracks", many=True, read_only=True
    )
    thumbnail = ThumbnailSerializer(read_only=True, allow_null=True)
    urls = serializers.SerializerMethodField()
    is_ready_to_play = serializers.BooleanField(read_only=True)

    def get_urls(self, obj):
        """Urls of the video for each type of encoding.

        Parameters
        ----------
        obj : Type[models.Video]
            The video that we want to serialize

        Returns
        -------
        Dictionary or None
            A dictionary of all urls for:
                - mp4 encodings of the video in each resolution
                - jpeg thumbnails of the video in each resolution
                - manifest of the DASH encodings of the video
                - manifest of the HLS encodings of the video
            None if the video is still not uploaded to S3 with success

        """
        if obj.uploaded_on is None:
            return None

        thumbnail_urls = {}
        try:
            thumbnail = obj.thumbnail
        except Thumbnail.DoesNotExist:
            pass
        else:
            if thumbnail.uploaded_on is not None:
                thumbnail_serialized = ThumbnailSerializer(thumbnail)
                thumbnail_urls.update(thumbnail_serialized.data.get("urls"))

        urls = {"mp4": {}, "thumbnails": {}}

        base = "{protocol:s}://{cloudfront:s}/{pk!s}".format(
            protocol=settings.AWS_S3_URL_PROTOCOL,
            cloudfront=settings.CLOUDFRONT_DOMAIN,
            pk=obj.pk,
        )
        stamp = time_utils.to_timestamp(obj.uploaded_on)

        date_less_than = timezone.now() + timedelta(
            seconds=settings.CLOUDFRONT_SIGNED_URLS_VALIDITY
        )
        for resolution in settings.VIDEO_RESOLUTIONS:
            # MP4
            mp4_url = "{base:s}/mp4/{stamp:s}_{resolution:d}.mp4".format(
                base=base,
                stamp=time_utils.to_timestamp(obj.uploaded_on),
                resolution=resolution,
            )

            # Thumbnails
            urls["thumbnails"][resolution] = thumbnail_urls.get(
                resolution,
                "{base:s}/thumbnails/{stamp:s}_{resolution:d}.0000000.jpg".format(
                    base=base, stamp=stamp, resolution=resolution
                ),
            )

            # Sign the urls of mp4 videos only if the functionality is activated
            if settings.CLOUDFRONT_SIGNED_URLS_ACTIVE:
                cloudfront_signer = CloudFrontSigner(
                    settings.CLOUDFRONT_ACCESS_KEY_ID, cloudfront_utils.rsa_signer
                )
                mp4_url = cloudfront_signer.generate_presigned_url(
                    mp4_url, date_less_than=date_less_than
                )

            urls["mp4"][resolution] = mp4_url

        # Adaptive Bit Rate manifests
        urls["manifests"] = {
            "dash": "{base:s}/cmaf/{stamp:s}.mpd".format(base=base, stamp=stamp),
            "hls": "{base:s}/cmaf/{stamp:s}.m3u8".format(base=base, stamp=stamp),
        }

        # Previews
        urls["previews"] = "{base:s}/previews/{stamp:s}_100.jpg".format(
            base=base, stamp=stamp
        )

        return urls


class UpdateStateSerializer(serializers.Serializer):
    """A serializer to validate data submitted on the UpdateState API endpoint."""

    key = serializers.RegexField(KEY_REGEX)
    state = serializers.ChoiceField(
        tuple(c for c in STATE_CHOICES if c[0] in (PROCESSING, READY, ERROR))
    )
    signature = serializers.CharField(max_length=200)

    def get_key_elements(self):
        """Use a regex to parse elements from the key."""
        elements = KEY_REGEX.match(self.validated_data["key"]).groupdict()
        elements["uploaded_on"] = time_utils.to_datetime(elements["stamp"])
        return elements


class VerbSerializer(serializers.Serializer):
    """Validate the verb in a xAPI statement."""

    id = serializers.URLField()

    display = serializers.DictField()


class ExtensionSerializer(serializers.Serializer):
    """Validate the context in a xAPI statement."""

    extensions = serializers.DictField()


class XAPIStatementSerializer(serializers.Serializer):
    """A serializer to validate a xAPI statement."""

    verb = VerbSerializer()
    context = ExtensionSerializer()
    result = ExtensionSerializer(required=False)

    id = serializers.RegexField(
        re.compile("^{uuid}$".format(uuid=UUID_REGEX)),
        required=False,
        default=str(uuid.uuid4()),
    )
    timestamp = serializers.DateTimeField()

    def validate(self, attrs):
        """Check if there is no extra arguments in the submitted payload."""
        unknown_keys = set(self.initial_data.keys()) - set(self.fields.keys())
        if unknown_keys:
            raise ValidationError("Got unknown fields: {}".format(unknown_keys))
        return attrs
