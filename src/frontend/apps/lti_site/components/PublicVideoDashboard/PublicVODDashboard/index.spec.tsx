import { screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import {
  useJwt,
  timedTextMockFactory,
  videoMockFactory,
  FULL_SCREEN_ERROR_ROUTE,
  useTimedTextTrack,
  timedTextMode,
  uploadState,
  useSharedLiveMedia,
  sharedLiveMediaMockFactory,
  PersistentStore,
  liveState,
  useCurrentResourceContext,
  decodeJwt,
} from 'lib-components';
import React from 'react';

import { DASHBOARD_ROUTE } from 'components/Dashboard/route';

import { createPlayer } from 'Player/createPlayer';
import render from 'utils/tests/render';
import { wrapInVideo } from 'utils/tests/wrapInVideo';

import { PublicVODDashboard } from '.';
import faker from 'faker';
import { QueryClient } from 'react-query';
import {
  LivePanelItem,
  useLivePanelState,
} from 'data/stores/useLivePanelState';

const mockVideo = videoMockFactory();
jest.mock('lib-components', () => ({
  ...jest.requireActual('lib-components'),
  getResource: jest.fn().mockResolvedValue(null),
  useAppConfig: () => ({
    attendanceDelay: 10000,
    video: mockVideo,
    static: {
      img: {
        liveBackground: 'some_url',
      },
    },
  }),
  useCurrentResourceContext: jest.fn(),
  decodeJwt: jest.fn(),
}));

jest.mock('Player/createPlayer', () => ({
  createPlayer: jest.fn(),
}));

jest.mock('components/ConverseInitializer', () => ({
  ConverseInitializer: ({ children }: { children: React.ReactNode }) => {
    return children;
  },
}));

const mockCreatePlayer = createPlayer as jest.MockedFunction<
  typeof createPlayer
>;

const queryClient: QueryClient = new QueryClient();
const mockedUseCurrentResourceContext =
  useCurrentResourceContext as jest.MockedFunction<
    typeof useCurrentResourceContext
  >;
const mockedDecodeJwt = decodeJwt as jest.MockedFunction<typeof decodeJwt>;

describe('<PublicVODDashboard />', () => {
  beforeEach(() => {
    useJwt.setState({
      jwt: 'token',
      getDecodedJwt: () =>
        ({
          permissions: {
            can_update: false,
          },
        } as any),
    });

    fetchMock.mock(
      '/api/timedtexttracks/',
      {
        actions: {
          POST: {
            language: {
              choices: [
                { display_name: 'English', value: 'en' },
                { display_name: 'French', value: 'fr' },
              ],
            },
          },
        },
      },
      { method: 'OPTIONS' },
    );
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('displays the video player alone', async () => {
    const video = videoMockFactory({
      show_download: false,
      has_transcript: false,
      shared_live_medias: [],
      urls: {
        manifests: {
          hls: 'https://example.com/hls.m3u8',
        },
        mp4: {
          144: 'https://example.com/144p.mp4',
          1080: 'https://example.com/1080p.mp4',
        },
        thumbnails: {
          144: 'https://example.com/thumbnail/144p.jpg',
          1080: 'https://example.com/thumbnail/1080p.jpg',
        },
      },
    });

    const { elementContainer: container } = render(
      wrapInVideo(<PublicVODDashboard playerType="videojs" />, video),
    );

    await waitFor(() =>
      // The player is created
      expect(mockCreatePlayer).toHaveBeenCalledWith(
        'videojs',
        expect.any(Element),
        expect.anything(),
        video,
        'en',
        expect.any(Function),
      ),
    );

    expect(
      container!.querySelector('source[src="https://example.com/144p.mp4"]'),
    ).not.toBeNull();
    expect(
      container!.querySelector('source[src="https://example.com/1080p.mp4"]'),
    ).not.toBeNull();
    expect(
      container!.querySelectorAll('source[type="video/mp4"]'),
    ).toHaveLength(2);
    const videoElement = container!.querySelector('video')!;
    expect(videoElement.tabIndex).toEqual(-1);
    expect(videoElement.poster).toEqual(
      'https://example.com/thumbnail/1080p.jpg',
    );
    expect(screen.queryByText('Transcript')).not.toBeInTheDocument();
    expect(screen.queryByText('Download video')).not.toBeInTheDocument();
  });

  it('displays the video player, the download, SharedLiveMedia and transcripts widgets', async () => {
    const videoId = faker.datatype.uuid();
    const timedTextTracks = [
      timedTextMockFactory({
        is_ready_to_show: true,
        mode: timedTextMode.TRANSCRIPT,
      }),
    ];
    const mockedSharedLiveMedia = sharedLiveMediaMockFactory({
      title: 'Title of the file',
      video: videoId,
    });
    useTimedTextTrack.getState().addMultipleResources(timedTextTracks);
    useSharedLiveMedia.getState().addResource(mockedSharedLiveMedia);
    const video = videoMockFactory({
      id: videoId,
      has_transcript: true,
      show_download: true,
      timed_text_tracks: timedTextTracks,
      urls: {
        manifests: {
          hls: 'https://example.com/hls.m3u8',
        },
        mp4: {
          144: 'https://example.com/144p.mp4',
          1080: 'https://example.com/1080p.mp4',
        },
        thumbnails: {
          144: 'https://example.com/thumbnail/144p.jpg',
          1080: 'https://example.com/thumbnail/1080p.jpg',
        },
      },
    });

    render(wrapInVideo(<PublicVODDashboard playerType="videojs" />, video));

    await waitFor(() =>
      // The player is created
      expect(mockCreatePlayer).toHaveBeenCalledWith(
        'videojs',
        expect.any(Element),
        expect.anything(),
        video,
        'en',
        expect.any(Function),
      ),
    );

    screen.getByText('Transcripts');
    screen.getByText('Download video');
    screen.getByText('Supports sharing');
  });

  it('uses subtitles as transcripts', async () => {
    const timedTextTracks = [
      timedTextMockFactory({
        id: 'ttt-1',
        is_ready_to_show: true,
        mode: timedTextMode.SUBTITLE,
      }),
    ];
    useTimedTextTrack.getState().addMultipleResources(timedTextTracks);
    const video = videoMockFactory({
      has_transcript: false,
      show_download: true,
      should_use_subtitle_as_transcript: true,
      timed_text_tracks: timedTextTracks,
      urls: {
        manifests: {
          hls: 'https://example.com/hls.m3u8',
        },
        mp4: {
          144: 'https://example.com/144p.mp4',
          1080: 'https://example.com/1080p.mp4',
        },
        thumbnails: {
          144: 'https://example.com/thumbnail/144p.jpg',
          1080: 'https://example.com/thumbnail/1080p.jpg',
        },
      },
    });

    render(wrapInVideo(<PublicVODDashboard playerType="videojs" />, video));

    await waitFor(() =>
      // The player is created
      expect(mockCreatePlayer).toHaveBeenCalledWith(
        'videojs',
        expect.any(Element),
        expect.anything(),
        video,
        'en',
        expect.any(Function),
      ),
    );

    screen.getByText('Transcripts');
    screen.getByText('Download video');
  });

  it('redirects to the error component when upload state is deleted', () => {
    const video = videoMockFactory({
      upload_state: uploadState.DELETED,
    });

    render(wrapInVideo(<PublicVODDashboard playerType="videojs" />, video), {
      routerOptions: {
        routes: [
          {
            path: DASHBOARD_ROUTE(),
            render: ({ match }) => (
              <span>{`dashboard ${match.params.objectType}`}</span>
            ),
          },
          {
            path: FULL_SCREEN_ERROR_ROUTE(),
            render: ({ match }) => (
              <span>{`Error Component: ${match.params.code}`}</span>
            ),
          },
        ],
      },
    });

    screen.getByText('Error Component: videoDeleted');
  });

  it('redirects to the error component when video has no urls', () => {
    const video = videoMockFactory({
      urls: null,
    });

    render(wrapInVideo(<PublicVODDashboard playerType="videojs" />, video), {
      routerOptions: {
        routes: [
          {
            path: DASHBOARD_ROUTE(),
            render: ({ match }) => (
              <span>{`dashboard ${match.params.objectType}`}</span>
            ),
          },
          {
            path: FULL_SCREEN_ERROR_ROUTE(),
            render: () => <span>{`Error Component`}</span>,
          },
        ],
      },
    });

    screen.getByText('Error Component');
  });

  it('uses the VideoLayout when the video is a Live-converted VOD', async () => {
    mockedUseCurrentResourceContext.mockReturnValue([
      {
        permissions: { can_update: false },
      },
    ] as any);
    mockedDecodeJwt.mockReturnValue({} as any);

    const video = videoMockFactory({
      show_download: false,
      has_transcript: false,
      shared_live_medias: [],
      urls: {
        manifests: {
          hls: 'https://example.com/hls.m3u8',
        },
        mp4: {
          144: 'https://example.com/144p.mp4',
          1080: 'https://example.com/1080p.mp4',
        },
        thumbnails: {
          144: 'https://example.com/thumbnail/144p.jpg',
          1080: 'https://example.com/thumbnail/1080p.jpg',
        },
      },
      live_info: {
        medialive: {
          input: {
            endpoints: [
              'rtmp://1.2.3.4:1935/stream-key-primary',
              'rtmp://4.3.2.1:1935/stream-key-secondary',
            ],
          },
        },
      },
      live_state: liveState.ENDED,
      xmpp: {
        bosh_url: null,
        converse_persistent_store: PersistentStore.LOCALSTORAGE,
        conference_url: 'conference-url',
        jid: 'jid',
        prebind_url: 'prebind_url',
        websocket_url: null,
      },
    });

    const { elementContainer: container } = render(
      wrapInVideo(<PublicVODDashboard playerType="player_type" />, video),
      { queryOptions: { client: queryClient } },
    );

    // Displays video
    const videoElement = container!.querySelector('video')!;
    expect(videoElement.tabIndex).toEqual(-1);

    // Displays Chat and Chat only
    expect(useLivePanelState.getState().isPanelVisible).toEqual(true);
    expect(useLivePanelState.getState().currentItem).toEqual(
      LivePanelItem.CHAT,
    );
    expect(useLivePanelState.getState().availableItems).toEqual([
      LivePanelItem.CHAT,
    ]);
  });
});
