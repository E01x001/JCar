# Task ID: 126

**Title:** Fix soft-delete contradiction: defer destructive deletion to permanent-delete

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** cascadeDeleteUser advertises a 30-day recovery window (Task 76, shown to users in MyPageScreen), but it immediately and permanently deletes vehicles, consultations, and Storage images. recoverDeletedUser only restores the user doc + re-enables auth, so recovered accounts have lost all their data.

**Details:**

functions/accountManagement/cascadeDelete.js currently hard-deletes vehicles (Step 3, incl. private contact subdoc), consultations (Step 4), and Storage images (Step 5) during what is supposed to be a SOFT delete (Step 6 marks accountStatus=pending_deletion with a 30-day window). Options: (a) on soft-delete, only mark/disable and DEFER destructive deletion; implement the scheduled permanent-delete function (the TODO at the NOTE block) that runs daily and performs the vehicle/consultation/storage/private-subdoc/user/auth deletion for accounts past permanentDeleteDate; recoverDeletedUser then restores everything because nothing was destroyed yet. (b) If immediate destruction is intended, stop advertising recovery of data and update copy. Recommended: (a). Requires a Cloud Scheduler/pubsub scheduled function + moving the Step 3-5 logic there.

**Test Strategy:**

Soft-delete an account, then recover within window: vehicles/consultations/images/private docs all still present. After permanentDeleteDate, scheduled function removes everything (Firestore + Storage + Auth). Verify no orphaned private subdocs or Storage objects remain.
