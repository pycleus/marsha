import { appData } from 'data/appData';
import { API_ENDPOINT } from 'settings';
import { LiveRegistration } from 'types/tracks';

export const setLiveRegistrationDisplayName = async (
  displayName: string,
  anonymousId?: string,
): Promise<{
  error?: string | number;
  success?: LiveRegistration;
}> => {
  const body = {
    display_name: displayName,
    anonymous_id: anonymousId,
  };

  const response = await fetch(
    `${API_ENDPOINT}/liveregistrations/display_name/`,
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${appData.jwt}`,
        'Content-Type': 'application/json',
      },
      method: 'PUT',
    },
  );

  if (response.status === 409) {
    return { error: 409 };
  }

  if (!response.ok) {
    return { error: await response.json() };
  }

  return { success: await response.json() };
};
