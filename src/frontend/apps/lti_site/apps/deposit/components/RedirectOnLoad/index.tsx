import {
  ErrorComponents,
  appState,
  builderFullScreenErrorRoute,
  flags,
  useAppConfig,
} from 'lib-components';
import { Navigate } from 'react-router-dom';

import { RESOURCE_PORTABILITY_REQUEST_ROUTE } from 'components/PortabilityRequest/route';
import { useIsFeatureEnabled } from 'data/hooks/useIsFeatureEnabled';

import { DASHBOARD_ROUTE } from '../Dashboard/route';

// RedirectOnLoad assesses the initial state of the application using appData and determines the proper
// route to load in the Router
export const RedirectOnLoad = () => {
  const appData = useAppConfig();
  const isFeatureEnabled = useIsFeatureEnabled();

  // Get LTI errors out of the way
  if (appData.state === appState.ERROR) {
    return <Navigate to={builderFullScreenErrorRoute(ErrorComponents.lti)} />;
  }

  if (!isFeatureEnabled(flags.DEPOSIT)) {
    return (
      <Navigate to={builderFullScreenErrorRoute(ErrorComponents.notFound)} />
    );
  }

  if (appData.state === appState.PORTABILITY) {
    return <Navigate to={RESOURCE_PORTABILITY_REQUEST_ROUTE} />;
  }

  return <Navigate to={DASHBOARD_ROUTE} />;
};
