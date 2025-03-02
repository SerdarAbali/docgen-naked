import Konva from 'konva';

declare module 'konva' {
  interface Node<Config> {
    intersects(pos: { x: number; y: number }): boolean;
  }
} 