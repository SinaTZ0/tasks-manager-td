import { createCaptchaChallengeProcedure } from "#/orpc/captcha/procedure";
import { implementer } from "#/orpc/implementer.server";
import { uploadMediaProcedure } from "#/orpc/media/procedure";
import { createNoteProcedure, deleteNoteProcedure, listNotesProcedure } from "#/orpc/note/procedure";
import {
  createProjectProcedure,
  getProjectProcedure,
  listProjectsProcedure,
  moveColumnProcedure,
  renameProjectProcedure,
  setProjectMemberProcedure,
  updateColumnProcedure,
} from "#/orpc/project/procedure";
import { viewerProcedure } from "#/orpc/session/procedure";
import { siteOriginProcedure } from "#/orpc/site/procedure";
import {
  archiveTaskProcedure,
  createLabelProcedure,
  createTaskProcedure,
  getTaskProcedure,
  moveTaskProcedure,
  taskBoardProcedure,
  updateTaskProcedure,
} from "#/orpc/task/procedure";
import {
  createTeamMemberProcedure,
  listTeamProcedure,
  setTeamMemberRoleProcedure,
  setTeamMemberStatusProcedure,
} from "#/orpc/team/procedure";

/*===== API Router =====*/
// Assembled with the undecorated implementer (see `implementer.server.ts`).
export const router = implementer.router({
  captcha: {
    createChallenge: createCaptchaChallengeProcedure,
  },
  media: {
    upload: uploadMediaProcedure,
  },
  note: {
    list: listNotesProcedure,
    create: createNoteProcedure,
    delete: deleteNoteProcedure,
  },
  project: {
    list: listProjectsProcedure,
    get: getProjectProcedure,
    create: createProjectProcedure,
    rename: renameProjectProcedure,
    setMember: setProjectMemberProcedure,
    updateColumn: updateColumnProcedure,
    moveColumn: moveColumnProcedure,
  },
  session: {
    viewer: viewerProcedure,
  },
  site: {
    origin: siteOriginProcedure,
  },
  task: {
    board: taskBoardProcedure,
    get: getTaskProcedure,
    create: createTaskProcedure,
    update: updateTaskProcedure,
    move: moveTaskProcedure,
    archive: archiveTaskProcedure,
    createLabel: createLabelProcedure,
  },
  team: {
    list: listTeamProcedure,
    create: createTeamMemberProcedure,
    setRole: setTeamMemberRoleProcedure,
    setStatus: setTeamMemberStatusProcedure,
  },
});
