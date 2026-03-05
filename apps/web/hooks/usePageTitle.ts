import { useEffect } from "react";

const APP_NAME = "Chapter Check";

/**
 * Sets the document title. Pass null/undefined to reset to app name only.
 * Title format: "Page Title | Chapter Check" or just "Chapter Check"
 */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | ${APP_NAME}`;
    } else {
      document.title = APP_NAME;
    }

    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
