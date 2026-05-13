<?php

declare(strict_types=1);

class UploadController extends Controller
{
    // POST /upload/image
    public function image(): void
    {
        if (empty($_FILES['image'])) {
            $this->error('No image file provided', 422);
        }

        $file    = $_FILES['image'];
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
        ];
        $maxSize = 10 * 1024 * 1024;

        // Log file info for debugging
        error_log('Upload attempt - Name: ' . ($file['name'] ?? 'unknown') . ', Size: ' . ($file['size'] ?? 0) . ', Error: ' . ($file['error'] ?? 'none'));

        // Check for upload errors
        $errorCode = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($errorCode !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE   => 'File exceeds upload_max_filesize',
                UPLOAD_ERR_FORM_SIZE  => 'File exceeds MAX_FILE_SIZE',
                UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            ];
            $this->error($errorMessages[$errorCode] ?? 'Upload failed', 422);
        }

        // Check file size
        if (($file['size'] ?? 0) === 0) {
            $this->error('File is empty. Please select a valid image file', 422);
        }

        if (($file['size'] ?? 0) > $maxSize) {
            $this->error('Image must be under 10MB', 422);
        }

        $mime = mime_content_type($file['tmp_name']);
        error_log('Detected MIME type: ' . ($mime ?? 'unknown'));
        if (!isset($allowed[$mime])) {
            $this->error("Invalid file type: $mime. Only JPG, PNG and WebP images are allowed", 422);
        }

        $type   = $_POST['type'] ?? 'car';
        $subdir = in_array($type, ['car', 'damage'], true) ? $type . 's' : 'misc';

        $uploadDir = ROOT . '/public/uploads/' . $subdir . '/';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
            $this->error('Failed to prepare upload directory', 500);
        }

        $filename = bin2hex(random_bytes(12)) . '.' . $allowed[$mime];
        $dest     = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            $this->error('Failed to save image', 500);
        }

        $this->success([
            'filename' => $filename,
            'url'      => '/public/uploads/' . $subdir . '/' . $filename,
        ], 'Image uploaded successfully', 201);
    }
}
