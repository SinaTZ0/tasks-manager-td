import { captchaContract } from "#/orpc/captcha/contract";
import { mediaContract } from "#/orpc/media/contract";
import { noteContract } from "#/orpc/note/contract";
import { projectContract } from "#/orpc/project/contract";
import { sessionContract } from "#/orpc/session/contract";
import { siteContract } from "#/orpc/site/contract";
import { taskContract } from "#/orpc/task/contract";
import { teamContract } from "#/orpc/team/contract";

/*===== API Contract =====*/
// Source of truth for the API. The browser client is typed from this, never from the router.
export const contract = {
  captcha: captchaContract,
  media: mediaContract,
  note: noteContract,
  project: projectContract,
  session: sessionContract,
  site: siteContract,
  task: taskContract,
  team: teamContract,
};
