import { CheerioAPI, load } from 'cheerio';
import { LibrusClient } from '../..';
import Module from '../utils/Module';
import _ from 'lodash';
import Api from '../utils/api';
import { AxiosResponse } from 'axios';
import { Timetable, TimetableEvent, TimetableEventType } from '../../types';



function getCurrentWeekBoundaryDays() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 1 + - today.getDay());
    const end = new Date(today);
    end.setDate(today.getDate() + 1 + (6 - today.getDay()));
    return [ start.toISOString().split("T")[0], end.toISOString().split("T")[0] ];
  }
export default class Calendar extends Module {
    constructor(client: LibrusClient) {
        super(client);
    }

    public async getEventDetails(id: number, isAbsence = false) {
        if (isAbsence)
            return this.client.api.tableMapper(
                `terminarz/szczegoly_wolne/${id}`,
                'table.decorated.small.center tbody',
                ['teacher', 'range', 'added']
            );

        return this.client.api.tableMapper(
            `terminarz/szczegoly/${id}`,
            'table.decorated.medium.center tbody',
            ['date', 'lessonIndex', 'teacher', 'type', 'lesson', 'description', 'added']
        );
    }

    public async getTimetable(month: number = new Date().getMonth() + 1) {
        const currentDate = new Date();

        const parser = ($: CheerioAPI, column: string) => {
            const table = $(column).next('table');
            if (!table) return [];

            return _.map($(table).find('td'), child => {
                let attr = $(child).attr('onclick');
                const id = attr && attr.match(/\/(\d*)'$/)?.[1];
                const title = $(child).html();
                const day = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${$(column).text()}`
                const parsedEvent = parseTimetableEvent({
                    title: title ?? "",
                    id: id ?? "-1",
                    day
                });
                return parsedEvent;
            });
        };

        return this.client.api.mapper(
            'terminarz',
            'table.kalendarz.decorated.center tbody td .kalendarz-numer-dnia',
            parser,
            'POST',
            {
                form: {
                    miesiac: month,
                },
            }
        ) as unknown as Promise<Timetable>;
    }

    public async getLessonsPlan(
        type: 'formatted' | 'rowBased' | 'raw' = 'formatted',
        from: string = getCurrentWeekBoundaryDays()[0],
        to: string = getCurrentWeekBoundaryDays()[1]
    ) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        type Field = {
            flag: string;
            title: string;
        };

        const startDate = new Date(from);
        const endDate = new Date(to);
        if (endDate.getTime() - startDate.getTime() > 7 * 24 * 60 * 60 * 1000)
            throw new Error('Date range cannot be longer than 7 days');

        const parser = ($: CheerioAPI, row: string) => {
            const list = _.map(
                $(row).children('td:not(:nth-child(-n+2)):not(:last-child)'),
                cell => {
                    const regex = /([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)(\d{4}-\d{2}-\d{2})/;
                    const title = $(cell).find('.text').text().trim();

                    let fields = {
                        firstField: null as Field | null,
                        secondField: null as Field | null,
                    };

                    const hasFlag = $(cell).find('s').length === 4;
                    if (hasFlag) {
                        const firstField = {
                            flag:
                                $(cell).children().eq(1).text().trim() ||
                                $(cell).children().eq(1).first().text().trim(),
                            title: $(cell).find('.text').first().text().trim(),
                        };

                        const seceondFlag = {
                            flag:
                                $(cell).children().eq(3).text().trim() ||
                                $(cell).children().eq(3).first().text().trim(),
                            title: $(cell).find('.text').first().text().trim(),
                        };

                        fields = {
                            firstField,
                            secondField: $(cell).find('.text').length > 1 ? seceondFlag : null,
                        };
                    }

                    if (!title) return null;

                    return {
                        title,
                        /** @EXP might be useful later, no data to test it on currently. */
                        // flag:
                        //     $(cell).find('.center.plan-lekcji-info.tooltip').text().trim() ||
                        //     $(cell).find('.center.plan-lekcji-info').text().trim(),
                        // fields,
                    };
                }
            );
            return {
                hour: $(row).find('th').text().trim(),
                list,
            };
        };

        const tableMapper = ($: CheerioAPI) => {
            let table: any = [],
                rows = Api.arrayMapper(
                    $,
                    parser,
                    'table.decorated.plan-lekcji tr:nth-child(odd)'
                ) as unknown as ReturnType<typeof parser>;

            const hours = _.map(rows, 'hour').slice(1, -1);

            if (type === 'raw') table = rows;
        
            if (type === 'rowBased') {
                let i = 1;
                _.each(rows, (v: any) => {
                    if(!v.hour) return;
                    
                    let obj: any = {
                        lesson_number: i,
                        hours: v.hour,
                    }
    
                    v.list.forEach((lesson: any, index: number) => {
                        const [lessonTitle, teacher] = lesson?.title?.split('-') ?? [undefined, undefined];
                        obj[days[index].toLowerCase()] = {
                            title: lessonTitle?.trim(),
                            teacher: teacher?.trim()
                            // teacher: "rodo to nie pokaze            "
                        };
                    })

                    
                    table.push(obj);
    
                    i++;
                });
            } else {
                table = {};
                _.each(rows, (v: any) => {
                    for (let i = 0; i < v.list.length; i++) {
                        const k = days[i];
                        if (v.list[i] instanceof Object)
                            Object.assign((table[k] = table[k] || {}), v.list[i]);
                        else {
                            if (!Array.isArray(table[k].lessons)) {
                                table[k].lessons = [];
                            }
                            table[k].lessons.push(v.list[i]);
                        }
                    }
                });
            }
            return {
                hours,
                table,
            };
        };

        const reqData = new FormData();
        reqData.append('tydzien', `${from}_${to}`);

        return this.client.api.request('POST', 'przegladaj_plan_lekcji', reqData).then(res => {
            return tableMapper(load(res.html()));
        });
    }
}



type TParseTimetableEvent = {
    id: string;
    title: string;
    day: string;
}
function parseTimetableEvent({ id, title, day}: TParseTimetableEvent): TimetableEvent {
    title = title.replace(/\n/g, "").trim();
    const match = (rgx: RegExp) => title.match(rgx);

    if(title.startsWith("Nieobecność")) {
        const res = match(/^Nieobecność:.*?:\s(.*?)Godziny:\s(.*?)\sdo\s(.*?)$|^Nieobecność:.*?:\s(.*?)$/);
        return {
            id,
            title: "Nieobecność nauczyciela",
            type: TimetableEventType.TeacherAbsence,
            teacher: res?.[1] ?? res?.[4],
            timeStart: res?.[2],
            timeEnd: res?.[3],
        }
    } else if(title.startsWith("Zastępstwo")) {
        const res = match(/^Zastępstwo z (.*?) na lekcji nr: (\d+) \((.*?)\)$/)

        return {
            id,
            title: "Zastępstwo",
            type: TimetableEventType.TeacherChange,
            teacher: res?.[1],
            lessonNumber: res?.[2],
            lesson: res?.[3]
        }
    } else if(/zapowiedzian./.test(title)) {
        const res = match(/Nr lekcji: (\d+)<br><span class="przedmiot">(.+)<\/span>, (.+?)<br>(.+)(?:<br>Sala:&nbsp;(\d+))?/)
        console.log(title, res);
        return {
            id,
            title: "Zapowiedziana praca pisemna",
            type: TimetableEventType.ScheduledClasswork,
            lessonNumber: res?.[1],
            lesson: res?.[2],
            contents: res?.[3],
            class: res?.[4],
            classroom: res?.[5]
        }
    }

    else {
        return {
            id,
            title,
            type: TimetableEventType.Unknown,
        }
    }
}

