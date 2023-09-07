type ObjectValues<T> = T[keyof T];
export type RESTMethod = 'GET' | 'POST';

export type AccountInfo = {
    student: {
        name: string;
        class: string;
        index: string;
        teacher: string;
    };
    account: {
        name: string;
        login: string;
    };
};

export type Attachment = {
    name: string;
    path: string;
};

export type Message = {
    id: string;
    folderId: string;
    url: string;
    user: string;
    title: string;
    date: string;
    files: Attachment[];
    content: string;
    html: string;
    read: boolean;
};

export type Grade = {
    grade: string;
    category: string;
    date: string;
    teacher: string;
    lesson: string;
    inAvarage: string;
    weight: string;
    user: string;
    comment: string;
};

export type Assignment = {
    id: number;
    user: string;
    title: string;
    type: string;
    from: string;
    to: string;
    status: string;
};

export type Timetable = {
    id: number;
    day: string;
    title: string;
};

const RECEIVER_TYPE = {
    wychowawca: 'wychowawca',
    nauczyciel: 'nauczyciel',
    pedagogue: 'pedagogue',
    admin: 'admin',
    librus: 'sadmin',
} as const;

export type ReceiverType = ObjectValues<typeof RECEIVER_TYPE>;
