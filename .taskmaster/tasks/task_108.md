# Task ID: 108

**Title:** Implement Image Cropping and Preview Functionality Before Submission

**Status:** pending

**Dependencies:** 107 ✓

**Priority:** high

**Description:** Provide users with the ability to crop and preview images before they are submitted as part of the vehicle registration process.

**Details:**

Utilize `react-native-image-crop-picker` (from Task 107) to allow users to crop selected images to a desired aspect ratio or size after selection. Before the final submission in `VehicleRegistrationScreen.js`, display a clear preview of all selected and potentially cropped images, allowing users to review their selections. Provide options to reorder or remove images from the preview.

**Test Strategy:**

Select multiple images. Verify that the cropping tool functions correctly for each image. Check that all selected and cropped images are displayed in a clear preview area. Test reordering and removing images from the preview list. Confirm that the final submitted images reflect the user's cropping and selection choices.
