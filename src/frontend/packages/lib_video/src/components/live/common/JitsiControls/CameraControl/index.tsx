import { Button } from '@openfun/cunningham-react';
import { Nullable } from 'lib-common';
import { Box, CameraOffSVG, CameraOnSVG } from 'lib-components';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { useJitsiApi } from '@lib-video/hooks/useJitsiApi';

const messages = defineMessages({
  disableTitle: {
    defaultMessage: 'Show cam',
    description: 'Title for jitsi show/hide camera button when camera is off',
    id: 'JitsiControls.CameraControl.disableTitle',
  },
  enableTitle: {
    defaultMessage: 'Hide cam',
    description: 'Title for jitsi show/hide camera button when camera is on',
    id: 'JitsiControls.CameraControl.enableTitle',
  },
});

export const CameraControl = () => {
  const intl = useIntl();
  const [jitsiApi] = useJitsiApi();
  const [isCameraOn, setIsCameraOn] = useState<Nullable<boolean>>(null);
  const handleCameraSwitch = useCallback(({ muted }: { muted: boolean }) => {
    setIsCameraOn(!muted);
  }, []);

  useEffect(() => {
    if (!jitsiApi) {
      setIsCameraOn(null);
      return;
    }

    let canceled = false;
    jitsiApi.isVideoMuted().then((isMuted) => {
      if (canceled) {
        return;
      }

      setIsCameraOn(!isMuted);
    });

    jitsiApi.addListener('videoMuteStatusChanged', handleCameraSwitch);

    return () => {
      canceled = true;

      jitsiApi.removeListener('videoMuteStatusChanged', handleCameraSwitch);
    };
  }, [jitsiApi, handleCameraSwitch]);

  if (isCameraOn === null) {
    return <Fragment />;
  }

  return (
    <Button
      className="c__button-no-bg"
      color="tertiary"
      aria-label={intl.formatMessage(
        isCameraOn ? messages.enableTitle : messages.disableTitle,
      )}
      icon={
        <Box margin="auto" height={{ max: '35px' }} width={{ max: '35px' }}>
          {isCameraOn ? (
            <CameraOnSVG iconColor="white" height="100%" width="100%" />
          ) : (
            <CameraOffSVG iconColor="white" height="100%" width="100%" />
          )}
        </Box>
      }
      onClick={() => {
        if (!jitsiApi) {
          return;
        }

        jitsiApi.executeCommand('toggleVideo');
      }}
    />
  );
};
