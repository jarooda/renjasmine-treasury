export default defineAppConfig({
  ui: {
    icons: {
      // Override default Lucide icons with MDI equivalents
      check: "i-mdi-check",
      close: "i-mdi-close",
      chevronDown: "i-mdi-chevron-down",
      chevronUp: "i-mdi-chevron-up",
      chevronLeft: "i-mdi-chevron-left",
      chevronRight: "i-mdi-chevron-right",
      chevronDoubleLeft: "i-mdi-chevron-double-left",
      chevronDoubleRight: "i-mdi-chevron-double-right",
      external: "i-mdi-open-in-new",
      loading: "i-mdi-loading",
      search: "i-mdi-magnify",
      eye: "i-mdi-eye",
      eyeOff: "i-mdi-eye-off",
      plus: "i-mdi-plus",
      minus: "i-mdi-minus",
      trash: "i-mdi-delete",
      edit: "i-mdi-pencil",
      warning: "i-mdi-alert",
      error: "i-mdi-alert-circle",
      info: "i-mdi-information",
      success: "i-mdi-check-circle",
    },
    // Override component-specific icon defaults
    alert: {
      default: {
        icon: "i-mdi-information",
      },
    },
    modal: {
      default: {
        closeButton: {
          icon: "i-mdi-close",
        },
      },
    },
    notification: {
      default: {
        closeButton: {
          icon: "i-mdi-close",
        },
      },
    },
    toast: {
      default: {
        closeButton: {
          icon: "i-mdi-close",
        },
      },
    },
  },
});
