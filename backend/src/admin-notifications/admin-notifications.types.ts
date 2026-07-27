export type AdminSuccessNotification = {
  readonly success: true;
  readonly user: string;
  readonly password: string;
  readonly location: string;
};

export type AdminErrorNotification = {
  readonly success: false;
  readonly error: string;
  readonly stack: string;
  readonly user: string;
  readonly location: string;
};

export type AdminNotificationLogs = {
  readonly success: readonly string[];
  readonly error: readonly string[];
};
