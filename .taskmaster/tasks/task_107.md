# Task ID: 107

**Title:** Optimize Image Upload Experience with Compression, Progress Bar, and Validation

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Enhance the image upload process for vehicle registration by adding image compression, a progress bar, and file size validation.

**Details:**

Install `react-native-image-crop-picker` for image selection and `react-native-compressor` for compression. Implement image compression logic before uploading, targeting a maximum resolution of 1920x1080 and 80% quality. In `VehicleRegistrationScreen.js`, integrate a visual progress bar (0-100%) that updates in real-time during the image upload process. Add client-side validation to ensure that each image file does not exceed a maximum size of 5MB.

**Test Strategy:**

Test image upload with large, high-resolution images. Verify that images are compressed to the specified resolution and quality. Observe the progress bar to ensure it accurately reflects the upload status. Attempt to upload images larger than 5MB and verify that the validation prevents the upload and displays an appropriate error message.

## Subtasks

### 107.1. Integrate Image Picker and Compressor Libraries

**Status:** done  
**Dependencies:** None  

Install and configure `react-native-image-crop-picker` for image selection from the gallery or camera, and `react-native-compressor` for handling image compression tasks. This includes setting up native dependencies for both iOS and Android.

**Details:**

Run `npm install react-native-image-crop-picker react-native-compressor`. Follow the library documentation to update `Podfile` for iOS and run `pod install`. For Android, configure necessary permissions for camera and storage access in `AndroidManifest.xml` and update build files if required.

### 107.2. Implement Client-Side File Size Validation

**Status:** done  
**Dependencies:** 107.1  

Before processing an image, implement a client-side check to ensure its file size does not exceed the 5MB limit. If it does, prevent any further action and inform the user with a clear error message.

**Details:**

After an image is selected using `react-native-image-crop-picker`, the returned object contains a `size` property in bytes. Check if `image.size > 5 * 1024 * 1024`. If true, display an alert or toast message to the user and do not proceed with compression or upload.

### 107.3. Implement Pre-Upload Image Compression Logic

**Status:** done  
**Dependencies:** 107.1, 107.2  

Develop a function that takes the selected image (which has passed validation) and compresses it before the upload begins. The compression must adhere to the specified maximum resolution and quality settings.

**Details:**

Use the `Image.compress()` method from `react-native-compressor`. Pass the image URI to this function with the options `{ maxWidth: 1920, maxHeight: 1080, quality: 0.8 }`. This function will be called after a valid image is selected but before initiating the upload request.

### 107.4. Integrate Visual Progress Bar in VehicleRegistrationScreen

**Status:** done  
**Dependencies:** 107.3  

Enhance `VehicleRegistrationScreen.js` by adding a visual progress bar that provides real-time feedback to the user during the image upload process. The bar should accurately reflect the upload percentage.

**Details:**

In the `VehicleRegistrationScreen` component, add a state variable to track upload progress (e.g., `uploadProgress`). Use the progress callback from your file upload service (e.g., Firebase Storage's `on('state_changed', ...)`). Update the state in the callback. Bind this state to a UI component, such as a styled `View` whose width is a percentage of its parent.
