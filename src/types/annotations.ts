export type AnnotationType = 'circle' | 'rectangle' | 'arrow' | 'text' | 'freehand';

export type AnnotationColor = 'red' | 'yellow' | 'blue' | 'green';

export interface AnnotationObject {
  annotationId: string;
  semanticType: AnnotationType;
  color: AnnotationColor;
  label?: string;
  boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  // Raw Fabric.js object data for serialization
  fabricData?: Record<string, unknown>;
}

export interface AnnotationMetadata {
  annotations: AnnotationObject[];
  canvasWidth: number;
  canvasHeight: number;
  documentPage: number;
}
