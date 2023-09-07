import { Element, CheerioAPI } from 'cheerio';
import { LibrusClient } from '../..';
import Module from '../utils/Module';
import _, { Dictionary, Falsey } from 'lodash';
import { AccountInfo, Grade } from '../../types';

export default class Info extends Module {
    constructor(client: LibrusClient) {
        super(client);
    }

    public async getNotifications(): Promise<Dictionary<number>> {
        return (await this.client.api
            .mapper('uczen_index', '#graphic-menu ul li', ($: CheerioAPI, element: Element) => {
                return $(element).text().replace(/\D+/g, '').trim().length
                    ? $(element).text().replace(/\D+/g, '').trim()
                    : '0';
            })
            .then((data: Falsey[]): Dictionary<number> => {
                return _.zipObject(
                    ['grades', 'absence', 'messages', 'announcements', 'calendar', 'homework'],
                    data.slice(1).map((e: Falsey) => Number(e || 0))
                );
            })) as unknown as Promise<Dictionary<number>>;
    }

    public async getSubjects() {
        return await this.client.api.mapper(
            'moje_zadania',
            'form#formFiltrZadania select#przedmiot option',
            ($: CheerioAPI, option: string) => {
                return {
                    id: parseInt($(option).val() as string),
                    name: $(option).text().trim(),
                };
            }
        );
    }

    public async getAccountInfo(): Promise<AccountInfo> {
        const cheerioTrimmed = this.client.api.cheerioTrimmed;
        const selector = '#body > div > div > table > tbody > tr:nth-child';
        const parser = ($: CheerioAPI, element: string) => {
            return {
                student: {
                    name: $(`${selector}(1) > td`).text(),
                    class: cheerioTrimmed($(`${selector}(2) > td`)),
                    index: cheerioTrimmed($(`${selector}(3) > td`)),
                    teacher: cheerioTrimmed($(`${selector}(4) > td`)),
                },
                account: {
                    name: cheerioTrimmed($(`${selector}(7) > td`)),
                    login: cheerioTrimmed($(`${selector}(8) > td`)),
                },
            };
        };
        return this.client.api.singleMapper(
            'informacja',
            'html',
            parser
        ) as unknown as Promise<AccountInfo>;
    }

    public async getGrade(gradeId: string, pointGrade: boolean = false): Promise<Grade> {
        const parser = ($: CheerioAPI, table: string) => {
            const keys = [
                'grade',
                'category',
                'date',
                'teacher',
                'lesson',
                'inAverage',
                'multiplier',
                'user',
                'comment',
            ];

            switch ($(table).find('th').length) {
                case 7:
                    _.pullAt(keys, 5, 6);
                    break;

                case 8:
                    _.pullAt(keys, 6);
                    break;
            }

            const values = this.client.api.mapTableValues(table, keys);

            return 'inAverage' in values
                ? _.assign(values, {
                      inAverage: $(table).find('img').attr('src') === '/images/aktywne.png',
                  })
                : values;
        };
        return this.client.api.singleMapper(
            `przegladaj_oceny${pointGrade && '_punktowe'}/szczegoly/${gradeId}`,
            '.container-background table.decorated.medium.center tbody',
            parser
        ) as unknown as Promise<Grade>;
    }

    public async getLuckyNumber(): Promise<number> {
        const parser = ($: CheerioAPI, element: Element | any) =>
            parseInt(element.children[1].children[0].data);
        const res = await this.client.api
            .singleMapper('uczen/index', '.luckyNumber', parser)
            .then((data: Falsey) => data || 0);
        return res as unknown as Promise<number>;
    }

    // TODO: Honestly just find out if it works, I don't have any grades as of now to test it
    public async getGrades() {
        const parser = ($: CheerioAPI, row: string) => {
            const children = $(row).children('td');

            const avg = (columnIndex: number) => {
                const avg = parseFloat($(children[columnIndex]).text().trim());
                return isNaN(avg) ? -1 : avg;
            };

            const semester = (startColumn: number) => {
                const grades = _.map(
                    $(children[startColumn]).children('span.grade-box'),
                    element => {
                        return {
                            id: parseInt(
                                $(element).find('a').attr('href')?.split('/')[
                                    $(element).find('a').attr('href')?.split('/').length! - 1
                                ] || '0'
                            ),
                            value: $(element).text().trim(),
                        };
                    }
                );
                return {
                    grades,
                    tempAvarage: avg(startColumn + 1),
                    avarage: avg(startColumn + 2),
                };
            };

            const name = $(children[1]).text().trim();
            return {
                name,
                semester: [semester(2), semester(5), semester(6), semester(9)],
                tempAvarage: avg(8),
                avarage: avg(9),
            };
        };

        return await this.client.api.mapper(
            'przegladaj_oceny/uczen',
            "table.decorated.stretch > tbody > tr[class^='line']:not([name]):nth-child(n+2),table.decorated.stretch > tr[class^='line']:not([name]):nth-child(n+2)",
            parser
        );
    }
}
