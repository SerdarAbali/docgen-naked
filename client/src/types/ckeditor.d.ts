declare module '@ckeditor/ckeditor5-react' {
  import { Component } from 'react';
  import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
  
  export class CKEditor extends Component<{
    editor: typeof ClassicEditor;
    data?: string;
    id?: string;
    config?: any;
    onChange?: (event: any, editor: any) => void;
    onReady?: (editor: any) => void;
    onBlur?: (event: any, editor: any) => void;
    onFocus?: (event: any, editor: any) => void;
    onError?: (event: any, editor: any) => void;
    disabled?: boolean;
  }> {}
}

declare module '@ckeditor/ckeditor5-build-classic' {
  const ClassicEditorBuild: any;
  export = ClassicEditorBuild;
} 