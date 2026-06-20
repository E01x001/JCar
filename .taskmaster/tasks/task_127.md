# Task ID: 127

**Title:** Multiple vehicle images (upload + carousel)

**Status:** done

**Dependencies:** None

**Priority:** medium

**Description:** Schema imageUrl is typed string[] but the app stores/displays a single image. Support multiple images per vehicle: multi-select upload and a swipeable carousel.

**Details:**

imageHelpers: add pickMultipleFromGallery (openPicker multiple) + prepareImagesForUpload (reuse compress/validate). VehicleRegistrationScreen: hold an images array, thumbnail preview with per-image remove, upload loop, store imageUrls[] + imageUrl=imageUrls[0] for backward compat. New src/components/ImageCarousel.js using react-native-pager-view with dot indicator. VehicleDetailScreen + AdminVehicleDetailScreen render carousel from vehicle.imageUrls || [vehicle.imageUrl]. Storage rules unchanged (unique-filename create-only).

**Test Strategy:**

Register a vehicle with 3 images; verify imageUrls[] stored and carousel swipes on detail. Existing single-image vehicles still render via fallback. Buyer and admin detail both show carousel.
