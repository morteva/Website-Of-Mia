# Site source and Mira Site Editor

The user requires GitHub to remain updated with every site change because the Mira Site Editor reads these repositories. This is a standing requirement, not an optional release step.

- Make changes in this canonical repository. Preserve newer changes from other work.
- Include all changed source, content, assets, build scripts, Worker routes and configuration needed to reproduce the site. Never deploy from an independent staging directory.
- Run relevant checks and builds, review the resulting changes, commit and push to GitHub main before releasing. Reconcile remote changes without force-pushing or discarding work.
- Use the guarded repository deployment command. Verify GitHub contains the final changes before reporting completion. If a push fails, report the failure explicitly; do not claim the task is complete.
- Changes made through the Mira Site Editor must also be persisted in GitHub. A live-only change is not a complete site change.
- Keep credentials, authenticator secrets, subscriber information and private drafts out of Git. D1 and R2 contain runtime data; do not overwrite them during a source synchronization. If an authorized public-content change is made directly through the CMS, also reconcile its editable source or public-content export with GitHub so the editor cannot restore stale content. Do not claim automatic CMS-to-GitHub synchronization unless it has been implemented and verified.

See DEPLOYMENT.md for the shared Worker and runtime-data requirements.
