# Generated by Django 3.2.9 on 2021-11-25 14:47

import uuid

import django.contrib.postgres.fields
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0026_auto_20211125_1107"),
    ]

    operations = [
        migrations.CreateModel(
            name="Device",
            fields=[
                ("deleted", models.DateTimeField(editable=False, null=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        help_text="primary key for the record as UUID",
                        primary_key=True,
                        serialize=False,
                        verbose_name="id",
                    ),
                ),
                (
                    "created_on",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                        editable=False,
                        help_text="date and time at which a record was created",
                        verbose_name="created on",
                    ),
                ),
                (
                    "updated_on",
                    models.DateTimeField(
                        auto_now=True,
                        help_text="date and time at which a record was last updated",
                        verbose_name="updated on",
                    ),
                ),
            ],
            options={
                "verbose_name": "device",
                "verbose_name_plural": "devices",
                "db_table": "device",
            },
        ),
        migrations.CreateModel(
            name="LivePairing",
            fields=[
                ("deleted", models.DateTimeField(editable=False, null=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        help_text="primary key for the record as UUID",
                        primary_key=True,
                        serialize=False,
                        verbose_name="id",
                    ),
                ),
                (
                    "created_on",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                        editable=False,
                        help_text="date and time at which a record was created",
                        verbose_name="created on",
                    ),
                ),
                (
                    "updated_on",
                    models.DateTimeField(
                        auto_now=True,
                        help_text="date and time at which a record was last updated",
                        verbose_name="updated on",
                    ),
                ),
                (
                    "secret",
                    models.CharField(
                        help_text="live pairing secret",
                        max_length=6,
                        unique=True,
                        verbose_name="secret",
                    ),
                ),
                (
                    "video",
                    models.OneToOneField(
                        help_text="live pairing video",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="live_pairing",
                        to="core.video",
                        verbose_name="video",
                    ),
                ),
            ],
            options={
                "verbose_name": "live pairing",
                "verbose_name_plural": "live pairings",
                "db_table": "live_pairing",
                "ordering": ["created_on"],
            },
        ),
    ]
