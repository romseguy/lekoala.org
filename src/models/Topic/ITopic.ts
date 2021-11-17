import { IEvent } from "models/Event";
import { IOrg } from "models/Org";
import { ITopicMessage } from "models/TopicMessage";
import { IUser } from "models/User";

export interface ITopic {
  _id?: string;
  id?: string;
  topicName: string;
  topicMessages: ITopicMessage[];
  topicCategory?: string;
  topicVisibility?: string[];
  org?: IOrg;
  event?: IEvent;
  topicNotified?: ITopicNotified;
  createdBy: IUser | string;
  createdAt?: string;
}

export type ITopicNotified = {
  email?: string;
  phone?: string;
  status?: string;
}[];