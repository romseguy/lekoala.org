import { useRouter } from "next/router";
import React from "react";
import {
  Column,
  EntityConfigBannerPanel,
  EntityConfigLogoPanel,
  EntityConfigCategoriesPanel,
  EntityConfigStyles,
  Heading
} from "features/common";
import { OrgForm } from "features/forms/OrgForm";
import { getEventCategories, IOrg } from "models/Org";
import { ISubscription } from "models/Subscription";
import { Session } from "utils/auth";
import { AppQuery, AppQueryWithData } from "utils/types";
import { OrgConfigListsPanel } from "./OrgConfigListsPanel";
import { OrgConfigSubscribersPanel } from "./OrgConfigSubscribersPanel";
import { IsEditConfig } from "./OrgPage";
import { OrgConfigButtons } from "./OrgConfigButtons";

export type OrgConfigVisibility = {
  isVisible: Record<string, boolean>;
  toggleVisibility: (
    key?: keyof OrgConfigVisibility["isVisible"],
    bool?: boolean
  ) => void;
};

export const OrgConfigPanel = ({
  session,
  orgQuery,
  subQuery,
  isCreator,
  isEdit,
  isEditConfig,
  isMobile,
  isVisible,
  setIsConfig,
  setIsEdit,
  toggleVisibility
}: OrgConfigVisibility & {
  session: Session;
  orgQuery: AppQueryWithData<IOrg>;
  subQuery: AppQuery<ISubscription>;
  isCreator?: boolean;
  isEdit: boolean;
  isEditConfig?: IsEditConfig;
  isMobile: boolean;
  setIsConfig: (isConfig: boolean) => void;
  setIsEdit: (arg: boolean | IsEditConfig) => void;
}) => {
  const org = orgQuery.data;
  const router = useRouter();

  //#region local state
  //#endregion

  return (
    <>
      {isEdit && (
        <Column>
          <OrgForm
            isCreator={isCreator}
            isEditConfig={isEditConfig}
            session={session}
            orgQuery={orgQuery as AppQuery<IOrg>}
            onCancel={() => {
              setIsEdit(false);
              //setIsConfig(false);
            }}
            onSubmit={async (orgUrl: string) => {
              localStorage.removeItem("storageKey");

              if (orgUrl !== org.orgUrl) {
                await router.push(`/${orgUrl}`, `/${orgUrl}`, {
                  shallow: true
                });
              } else {
                setIsEdit(false);
                setIsConfig(false);
              }
            }}
          />
        </Column>
      )}

      {!isEdit && (
        <>
          <OrgConfigButtons
            isEdit={isEdit}
            isMobile={isMobile}
            isVisible={isVisible}
            orgQuery={orgQuery}
            setIsEdit={setIsEdit}
            toggleVisibility={toggleVisibility}
          />

          <Column mb={3} pt={1}>
            <Heading>Apparence</Heading>

            <EntityConfigStyles query={orgQuery} mt={3} mb={2} />

            <EntityConfigLogoPanel
              query={orgQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
              mb={3}
            />

            <EntityConfigBannerPanel
              query={orgQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
            />
          </Column>

          <Column mb={3} pt={1}>
            <Heading mb={1}>Koalas & Listes</Heading>
            <OrgConfigSubscribersPanel
              orgQuery={orgQuery}
              subQuery={subQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
              mb={3}
            />

            <OrgConfigListsPanel
              orgQuery={orgQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
            />
          </Column>

          <Column mb={3} pt={1}>
            <Heading>Discussions</Heading>

            <EntityConfigCategoriesPanel
              fieldName="orgTopicCategories"
              categories={org.orgTopicCategories}
              query={orgQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
            />
          </Column>

          <Column pt={1}>
            <Heading>Événements</Heading>

            <EntityConfigCategoriesPanel
              fieldName="orgEventCategories"
              categories={getEventCategories(org)}
              query={orgQuery}
              isVisible={isVisible}
              toggleVisibility={toggleVisibility}
            />
          </Column>
        </>
      )}
    </>
  );
};
