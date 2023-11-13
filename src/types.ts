type ObjectValues<T> = T[keyof T];
type Dict<T> = Record<string, T>;
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
    value: string;
    category: string;
    date: string;
    teacher: string;
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


const RECEIVER_TYPE = {
    wychowawca: 'wychowawca',
    nauczyciel: 'nauczyciel',
    pedagogue: 'pedagogue',
    admin: 'admin',
    librus: 'sadmin',
} as const;

export type ReceiverType = ObjectValues<typeof RECEIVER_TYPE>;

export enum TimetableEventType {
    TeacherAbsence = "teacher_absence",
    TeacherChange = "teacher_change",
    ScheduledClasswork = "scheduled_classwork",
    Unknown = "unknown",
}

export const CTimetableEventTypes = {
    ...TimetableEventType
} as const;



type PartialTimetableEvent = {
    id: string;
    title: string
}

export type TimetableEvent<T extends TimetableEventType = TimetableEventType> =
  PartialTimetableEvent & (
  T extends TimetableEventType.TeacherAbsence
    ? TeacherAbsenceEvent
    : T extends TimetableEventType.TeacherChange
      ? TeacherChangeEvent
      : T extends TimetableEventType.ScheduledClasswork
        ? ScheduledClasswork
      : T extends TimetableEventType.Unknown
        ? UnknownEvent
        : never
  );

export type Timetable = Array<TimetableEvent[]>

export type TeacherAbsenceEvent = {
    type: TimetableEventType.TeacherAbsence;
    teacher?: string;
    timeStart?: string;
    timeEnd?: string;
};

export type TeacherChangeEvent = {
    type: TimetableEventType.TeacherChange;
    teacher?: string;
    lessonNumber?: string;
    lesson?: string;
};

export type ScheduledClasswork = {
    type: TimetableEventType.ScheduledClasswork;
    lessonNumber?: string;
    lesson?: string;
    contents?: string;
    class?: string;
    classroom?: string;
}

export type UnknownEvent = {
    type: TimetableEventType.Unknown;
};

