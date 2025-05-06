import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { visit } from 'unist-util-visit';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export function rehypeInlineCodeProperty() {
  return function (tree: any) {
    visit(tree, 'element', function (node: any, index: any, parent: any) {
      if (node.tagName === 'code') {
        if (parent && parent.tagName === 'pre') {
          node.properties.inline = false;
        } else {
          node.properties.inline = true;
        }
      }
    });
  };
}
