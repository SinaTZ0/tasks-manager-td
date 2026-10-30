import { activityContract } from "#/orpc/activity/contract";
import { attachmentContract } from "#/orpc/attachment/contract";
import { captchaContract } from "#/orpc/captcha/contract";
import { checklistContract } from "#/orpc/checklist/contract";
import { commentContract } from "#/orpc/comment/contract";
import { delegationContract } from "#/orpc/delegation/contract";
import { dependencyContract } from "#/orpc/dependency/contract";
import { liveContract } from "#/orpc/live/contract";
import { mediaContract } from "#/orpc/media/contract";
import { noteContract } from "#/orpc/note/contract";
import { notificationContract } from "#/orpc/notification/contract";
import { profileContract } from "#/orpc/profile/contract";
import { projectContract } from "#/orpc/project/contract";
import { searchContract } from "#/orpc/search/contract";
import { sessionContract } from "#/orpc/session/contract";
import { siteContract } from "#/orpc/site/contract";
import { taskContract } from "#/orpc/task/contract";
import { teamContract } from "#/orpc/team/contract";
import { timeContract } from "#/orpc/time/contract";

/*===== API Contract =====*/
// Source of truth for the API. The browser client is typed from this, never from the router.
export const contract = {
  activity: activityContract,
  attachment: attachmentContract,
  captcha: captchaContract,
  checklist: checklistContract,
  comment: commentContract,
  delegation: delegationContract,
  dependency: dependencyContract,
  live: liveContract,
  media: mediaContract,
  note: noteContract,
  notification: notificationContract,
  profile: profileContract,
  project: projectContract,
  search: searchContract,
  session: sessionContract,
  site: siteContract,
  task: taskContract,
  team: teamContract,
  time: timeContract,
};
