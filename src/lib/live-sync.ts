export type DataSyncTopic = 'admin-data' | 'student-documents';

export type DataSyncMessage = {
    topic: DataSyncTopic;
    timestamp: number;
};

export const DATA_SYNC_CHANNEL = 'bsit-enrollment-data-sync';

export const notifyDataChanged = (topic: DataSyncTopic = 'admin-data') => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
        return;
    }

    try {
        const channel = new BroadcastChannel(DATA_SYNC_CHANNEL);
        const message: DataSyncMessage = {
            topic,
            timestamp: Date.now(),
        };
        channel.postMessage(message);
        channel.close();
    } catch (error) {
        console.warn('[LiveSync] Failed to broadcast data change.', error);
    }
};
