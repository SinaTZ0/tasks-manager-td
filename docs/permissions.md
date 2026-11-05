# Permissions

Who can do what. The roles are set in [task-manager-plan.md](./task-manager-plan.md) → Decisions → Roles. The API
checks every row here (the role middleware in `src/orpc/middleware/auth/auth.middleware.ts` and the services); the pages
only hide the keys a person can't use.

A **user** works only in the projects they are a member of. An **admin** sees and works in every project. A **viewer**
(the third role) can read everything a user can read and can't change anything; they can't be an owner, an assignee or
a delegate on a task. The only thing a viewer can upload is their own profile picture.

## Team and Projects

| Action                                                | Admin | User |
| ----------------------------------------------------- | :---: | :--: |
| See the team page                                     |  ✅   |  ❌  |
| Create an account                                     |  ✅   |  ❌  |
| Change someone's role, deactivate or reactivate them¹ |  ✅   |  ❌  |
| Reset someone else's password                         |  ✅   |  ❌  |
| Edit their own profile (name, picture, password)      |  ✅   |  ✅  |
| See every project                                     |  ✅   |  ❌  |
| See the projects they are a member of                 |  ✅   |  ✅  |
| Create a project                                      |  ✅   |  ❌  |
| Rename a project, choose its members                  |  ✅   |  ❌  |
| Rename columns, reorder them, set WIP limits          |  ✅   |  ❌  |
| Read a project's history                              |  ✅   |  ✅  |

¹ Not on themselves. The last active admin can't be demoted or deactivated.

## Tasks

| Action                                                      | Admin | User |
| ----------------------------------------------------------- | :---: | :--: |
| Create a task                                               |  ✅   |  ❌  |
| Edit a task (title, description, priority, dates, estimate) |  ✅   |  ✅  |
| Change the assignees                                        |  ✅   |  ✅  |
| Hand ownership to someone else                              |  ✅   | 🟡²  |
| Move a card, finish, stop or reopen a task                  |  ✅   |  ✅  |
| Delegate a task                                             |  ✅   |  ✅  |
| Add or remove a dependency                                  |  ✅   |  ✅  |
| Archive a task                                              |  ✅   |  ❌  |
| Restore an archived task                                    |  ✅   |  ❌  |
| Delete an archived task for good                            |  ✅   |  ❌  |
| Move or copy a task to another project                      |  ✅   |  ❌  |
| Watch or unwatch a task                                     |  ✅   |  ✅  |
| See "delegated by me"                                       |  ✅³  |  ✅  |

² Only on a task they own.

³ An admin sees the hand-offs of every project.

## Labels

| Action                             | Admin | User |
| ---------------------------------- | :---: | :--: |
| Tick or untick a label on a task   |  ✅   |  ✅  |
| Add a label to the project         |  ✅   |  ✅  |
| Rename or recolour a label         |  ✅   |  ❌  |
| Delete a label (off all its tasks) |  ✅   |  ❌  |

## On a Task

| Action                                        | Admin | User |
| --------------------------------------------- | :---: | :--: |
| Write a comment                               |  ✅   |  ✅  |
| Edit or delete a comment                      |  🟡⁴  | 🟡⁴  |
| Add, tick, reorder or remove a checklist item |  ✅   |  ✅  |
| Add an attachment (file or link)              |  ✅   |  ✅  |
| Remove an attachment                          |  ✅   | 🟡⁵  |

⁴ Only their own comment, admins included.

⁵ Only one they added.

## Keeping This Up to Date

A new procedure that a role limits, or a change to who can call one, adds or changes its row here in the same commit.
