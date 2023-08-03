import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { InfoWidgetModalProvider, useJwt } from 'lib-components';
import { render, userTypeDatePicker } from 'lib-tests';
import { DateTime, Settings } from 'luxon';

import { classroomMockFactory } from '@lib-classroom/utils/tests/factories';
import { wrapInClassroom } from '@lib-classroom/utils/wrapInClassroom';

import { RetentionDate } from '.';

Settings.defaultLocale = 'en';
Settings.defaultZone = 'Europe/Paris';

jest.mock('lib-components', () => ({
  ...jest.requireActual('lib-components'),
  report: jest.fn(),
}));

describe('Classroom <RetentionDate />', () => {
  beforeEach(() => {
    useJwt.setState({
      jwt: 'json web token',
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    fetchMock.restore();
  });

  it('renders the component and set a date with success', async () => {
    const mockedClassroom = classroomMockFactory();

    fetchMock.mock(`/api/classrooms/${mockedClassroom.id}/`, 200, {
      method: 'PATCH',
    });

    render(
      wrapInClassroom(
        <InfoWidgetModalProvider value={null}>
          <RetentionDate />
        </InfoWidgetModalProvider>,
        mockedClassroom,
      ),
    );

    expect(screen.getAllByText('Retention date')).toBeTruthy();

    const inputRetentionDate = within(
      screen.getByTestId('retention-date-picker'),
    ).getByRole('presentation');

    expect(inputRetentionDate).toHaveTextContent('mm/dd/yyyy');

    const retentionDate = DateTime.local()
      .plus({ days: 1 })
      .set({ second: 0, millisecond: 0 });

    await userTypeDatePicker(
      retentionDate,
      screen.getAllByText(/Retention date/i)[1],
    );

    expect(inputRetentionDate).toHaveTextContent(
      retentionDate.toLocaleString(),
    );

    await waitFor(() => expect(fetchMock.calls()).toHaveLength(1));

    const lastCall = fetchMock.lastCall();
    expect(lastCall).not.toBe(undefined);
    expect(lastCall?.[0]).toBe(`/api/classrooms/${mockedClassroom.id}/`);
    expect(lastCall?.[1]?.body).toEqual(
      `{"retention_date":"${retentionDate.toISODate()!}"}`,
    );
    expect(lastCall?.[1]?.method).toBe('PATCH');
  });

  it('renders the component with a default date and deletes it', async () => {
    const mockedClassroom = classroomMockFactory({
      retention_date: '2020-03-01',
    });

    fetchMock.mock(`/api/classrooms/${mockedClassroom.id}/`, 200, {
      method: 'PATCH',
    });

    render(
      wrapInClassroom(
        <InfoWidgetModalProvider value={null}>
          <RetentionDate />
        </InfoWidgetModalProvider>,
        mockedClassroom,
      ),
    );

    expect(screen.getAllByText('Retention date')).toBeTruthy();

    const inputRetentionDate = within(
      screen.getByTestId('retention-date-picker'),
    ).getByRole('presentation');
    expect(inputRetentionDate).toHaveTextContent('3/1/2020');

    const deleteButton = await screen.findByRole('button', {
      name: 'Delete retention date',
    });

    await userEvent.click(deleteButton);

    await waitFor(() => expect(fetchMock.calls()).toHaveLength(1));

    const lastCall = fetchMock.lastCall();
    expect(lastCall).not.toBe(undefined);
    expect(lastCall?.[0]).toBe(`/api/classrooms/${mockedClassroom.id}/`);
    expect(lastCall?.[1]?.body).toEqual('{"retention_date":null}');
    expect(lastCall?.[1]?.method).toBe('PATCH');
  });

  it('fails to update the video and displays the right error message', async () => {
    // Set by default with an All rights reserved license
    const mockedClassroom = classroomMockFactory({
      retention_date: '2020-01-01',
    });
    fetchMock.patch(`/api/classrooms/${mockedClassroom.id}/`, 401);

    render(
      wrapInClassroom(
        <InfoWidgetModalProvider value={null}>
          <RetentionDate />
        </InfoWidgetModalProvider>,
        mockedClassroom,
      ),
    );

    expect(screen.getAllByText('Retention date')).toBeTruthy();

    const deleteButton = await screen.findByRole('button', {
      name: 'Delete retention date',
    });

    await userEvent.click(deleteButton);

    await waitFor(() => expect(fetchMock.calls()).toHaveLength(1));

    await screen.findByText('Classroom update has failed!');
  });
});
