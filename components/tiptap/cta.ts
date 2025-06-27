import { Node, mergeAttributes } from "@tiptap/core";

export interface CtaOptions {
  defaultClass: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cta: {
      insertCta: (options: { href: string; label: string }) => ReturnType;
    };
  }
}

export const Cta = Node.create<CtaOptions>({
  name: "cta",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      defaultClass:
        "inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md",
    };
  },

  addAttributes() {
    return {
      href: { default: "#" },
      label: { default: "Click" },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-cta]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { href, label } = HTMLAttributes;
    return [
      "a",
      mergeAttributes(
        { "data-cta": "true", href, class: this.options.defaultClass },
        HTMLAttributes,
      ),
      label,
    ];
  },

  addCommands() {
    return {
      insertCta:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});