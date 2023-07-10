import { Box, Button, Grid } from 'grommet';
import { AddCircle, DocumentStore } from 'grommet-icons';
import { Nullable } from 'lib-common';
import { ContentCard, FileDepository, TextTruncated } from 'lib-components';
import React from 'react';
import { defineMessages, useIntl } from 'react-intl';

import { SelectContentTabProps } from 'components/SelectContent/SelectContentTabs';
import { buildContentItems } from 'components/SelectContent/utils';

const messages = defineMessages({
  addFileDepository: {
    defaultMessage: 'Add a file depository',
    description: `Text displayed on a button to add a new file depository.`,
    id: 'apps.deposit.SelectContent.addFileDepository',
  },
  select: {
    defaultMessage: 'Select {title}',
    description: 'Accessible message for selecting a file depository.',
    id: 'apps.deposit.SelectContent.select',
  },
});

const SelectContentCard = ({
  content,
  onClick,
}: {
  content: FileDepository;
  onClick: () => void;
}) => {
  const intl = useIntl();

  return (
    <ContentCard
      a11yTitle={intl.formatMessage(messages.select, {
        title: content.title || '',
      })}
      onClick={onClick}
      header={
        <Box
          aria-label="thumbnail"
          role="img"
          width="100%"
          height="150px"
          align="center"
          justify="center"
          background="radial-gradient(ellipse at center, #45a3ff 0%,#2169ff 100%)"
        >
          <DocumentStore size="large" color="white" />
        </Box>
      }
      title={content.title || ''}
    >
      {content.description && (
        <TextTruncated size="0.688rem" color="grey" title={content.description}>
          {content.description}
        </TextTruncated>
      )}
    </ContentCard>
  );
};

interface SelectContentSectionProps {
  addAndSelectContent: () => void;
  newLtiUrl: string;
  items: Nullable<FileDepository[]>;
  lti_select_form_data: SelectContentTabProps['lti_select_form_data'];
  setContentItemsValue: SelectContentTabProps['setContentItemsValue'];
}

export const SelectContentSection = ({
  addAndSelectContent,
  items,
  lti_select_form_data,
  setContentItemsValue,
}: SelectContentSectionProps) => {
  const intl = useIntl();
  return (
    <Box>
      <Box margin={{ vertical: 'medium' }}>
        <Button
          icon={<AddCircle />}
          secondary
          label={intl.formatMessage(messages.addFileDepository)}
          onClick={addAndSelectContent}
        />
      </Box>
      <Grid columns="small" gap="small">
        {items?.map((item: FileDepository) => (
          <SelectContentCard
            content={item}
            key={item.id}
            onClick={() =>
              buildContentItems(
                item.lti_url,
                item.title,
                item.description,
                lti_select_form_data,
                setContentItemsValue,
              )
            }
          />
        ))}
      </Grid>
    </Box>
  );
};
