import { projectActivityProcedure, taskActivityProcedure } from "#/orpc/activity/procedure";
import {
  addFileAttachmentProcedure,
  addLinkAttachmentProcedure,
  removeAttachmentProcedure,
} from "#/orpc/attachment/procedure";
import { createCaptchaChallengeProcedure } from "#/orpc/captcha/procedure";
import {
  addChecklistItemProcedure,
  moveChecklistItemProcedure,
  removeChecklistItemProcedure,
  updateChecklistItemProcedure,
} from "#/orpc/checklist/procedure";
import {
  addCommentProcedure,
  editCommentProcedure,
  listCommentsProcedure,
  pingTaskProcedure,
  removeCommentProcedure,
} from "#/orpc/comment/procedure";
import { delegatedByMeProcedure, delegateTaskProcedure } from "#/orpc/delegation/procedure";
import { addDependencyProcedure, removeDependencyProcedure } from "#/orpc/dependency/procedure";
import { implementer } from "#/orpc/implementer.server";
import { liveEventsProcedure } from "#/orpc/live/procedure";
import { uploadMediaProcedure } from "#/orpc/media/procedure";
import { createNoteProcedure, deleteNoteProcedure, listNotesProcedure } from "#/orpc/note/procedure";
import { listNotificationsProcedure, markNotificationsReadProcedure } from "#/orpc/notification/procedure";
import { getProfileProcedure, updateProfileProcedure } from "#/orpc/profile/procedure";
import {
  createProjectProcedure,
  getProjectProcedure,
  listProjectsProcedure,
  addColumnProcedure,
  moveColumnProcedure,
  removeColumnProcedure,
  renameProjectProcedure,
  setProjectMemberProcedure,
  updateColumnProcedure,
} from "#/orpc/project/procedure";
import { pushConfigProcedure, subscribePushProcedure, unsubscribePushProcedure } from "#/orpc/push/procedure";
import { clearReminderProcedure, myRemindersProcedure, setReminderProcedure } from "#/orpc/reminder/procedure";
import { searchTasksProcedure } from "#/orpc/search/procedure";
import { viewerProcedure } from "#/orpc/session/procedure";
import { siteOriginProcedure } from "#/orpc/site/procedure";
import {
  archivedTasksProcedure,
  archiveTaskProcedure,
  createLabelProcedure,
  createTaskProcedure,
  deleteLabelProcedure,
  deleteTaskProcedure,
  getTaskProcedure,
  moveTaskProcedure,
  myTasksProcedure,
  restoreTaskProcedure,
  taskBoardProcedure,
  transitionTaskProcedure,
  updateLabelProcedure,
  updateTaskProcedure,
} from "#/orpc/task/procedure";
import {
  createTeamMemberProcedure,
  listTeamProcedure,
  resetTeamMemberPasswordProcedure,
  setTeamMemberRoleProcedure,
  setTeamMemberStatusProcedure,
} from "#/orpc/team/procedure";
import { taskTimeProcedure } from "#/orpc/time/procedure";
import {
  copyTaskToProjectProcedure,
  moveTaskToProjectProcedure,
  resolveOldCodeProcedure,
} from "#/orpc/transfer/procedure";
import { unwatchTaskProcedure, watchTaskProcedure } from "#/orpc/watcher/procedure";

/*===== API Router =====*/
// Assembled with the undecorated implementer (see `implementer.server.ts`).
export const router = implementer.router({
  activity: {
    forTask: taskActivityProcedure,
    forProject: projectActivityProcedure,
  },
  attachment: {
    addFile: addFileAttachmentProcedure,
    addLink: addLinkAttachmentProcedure,
    remove: removeAttachmentProcedure,
  },
  captcha: {
    createChallenge: createCaptchaChallengeProcedure,
  },
  checklist: {
    add: addChecklistItemProcedure,
    update: updateChecklistItemProcedure,
    move: moveChecklistItemProcedure,
    remove: removeChecklistItemProcedure,
  },
  comment: {
    list: listCommentsProcedure,
    add: addCommentProcedure,
    ping: pingTaskProcedure,
    edit: editCommentProcedure,
    remove: removeCommentProcedure,
  },
  delegation: {
    delegate: delegateTaskProcedure,
    mine: delegatedByMeProcedure,
  },
  dependency: {
    add: addDependencyProcedure,
    remove: removeDependencyProcedure,
  },
  live: {
    events: liveEventsProcedure,
  },
  media: {
    upload: uploadMediaProcedure,
  },
  note: {
    list: listNotesProcedure,
    create: createNoteProcedure,
    delete: deleteNoteProcedure,
  },
  notification: {
    list: listNotificationsProcedure,
    markRead: markNotificationsReadProcedure,
  },
  profile: {
    get: getProfileProcedure,
    update: updateProfileProcedure,
  },
  project: {
    list: listProjectsProcedure,
    get: getProjectProcedure,
    create: createProjectProcedure,
    rename: renameProjectProcedure,
    setMember: setProjectMemberProcedure,
    updateColumn: updateColumnProcedure,
    moveColumn: moveColumnProcedure,
    addColumn: addColumnProcedure,
    removeColumn: removeColumnProcedure,
  },
  push: {
    config: pushConfigProcedure,
    subscribe: subscribePushProcedure,
    unsubscribe: unsubscribePushProcedure,
  },
  reminder: {
    mine: myRemindersProcedure,
    set: setReminderProcedure,
    clear: clearReminderProcedure,
  },
  search: {
    tasks: searchTasksProcedure,
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
    archived: archivedTasksProcedure,
    restore: restoreTaskProcedure,
    delete: deleteTaskProcedure,
    transition: transitionTaskProcedure,
    mine: myTasksProcedure,
    createLabel: createLabelProcedure,
    updateLabel: updateLabelProcedure,
    deleteLabel: deleteLabelProcedure,
  },
  team: {
    list: listTeamProcedure,
    create: createTeamMemberProcedure,
    setRole: setTeamMemberRoleProcedure,
    setStatus: setTeamMemberStatusProcedure,
    resetPassword: resetTeamMemberPasswordProcedure,
  },
  time: {
    forTask: taskTimeProcedure,
  },
  transfer: {
    move: moveTaskToProjectProcedure,
    copy: copyTaskToProjectProcedure,
    resolve: resolveOldCodeProcedure,
  },
  watcher: {
    watch: watchTaskProcedure,
    unwatch: unwatchTaskProcedure,
  },
});
