// Shim: redirect every bare 'ckeditor5' import (including those inside
// @ckeditor/ckeditor5-react) to the richtext-ckeditor5 Module Federation remote.
// This ensures no CKEditor5 code is bundled locally, preventing the
// ckeditor-duplicated-modules error.
export * from '@jahia/ckeditor5';
