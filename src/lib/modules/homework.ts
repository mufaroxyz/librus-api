import { CheerioAPI } from 'cheerio';
import { LibrusClient } from '../..';
import Module from '../utils/Module';
import { Assignment } from '../../types';

function getDates() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 4);
    const endDate = new Date();
    endDate.setDate(startDate.getDate() - 7);
    return [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];
}

export default class Homework extends Module {
    constructor(client: LibrusClient) {
        super(client);
    }

    public async listHomework(
        subjectId: string = '-1',
        from: string = getDates()[1],
        to: string = getDates()[0]
    ) {
        const startDate = new Date(to);
        const endDate = new Date(from);
        if (endDate.getMonth() - startDate.getMonth() > 1)
            throw new Error('Date range cannot be longer than 1 month');

        return this.client.api.mapper(
            'moje_zadania',
            'table.decorated.myHomeworkTable tbody tr',
            ($: CheerioAPI, row: string) => {
                const children = $(row).children('td');
                const matchResult = $(children[9])
                    .children('input')
                    .attr('onclick')
                    ?.match(/\/podglad\/(\d*)/);
                const id = matchResult ? parseInt(matchResult[1]) : 0;
                return {
                    id,
                    user: $(children[1]).text().trim(),
                    title: $(children[2]).text().trim(),
                    type: $(children[3]).text().trim(),
                    from: $(children[4]).text().trim(),
                    to: $(children[6]).text().trim(),
                    status: $(children[8]).text().trim(),
                };
            },
            'POST',
            {
                form: {
                    dataOd: from,
                    dataDo: to,
                    przedmiot: subjectId,
                    submitFiltr: 'Filtruj',
                },
            }
        ) as unknown as Promise<Assignment[]>;
    }

    // TODO: Check if it works when possible as tableMapper had to be modified, also add more precise typing
    public async getHomeworkDetails(id: string): Promise<Record<string, string>> {
        return this.client.api.tableMapper(`moje_zadania/podglad/${id}`, 'table.decorated tbody', [
            'user',
            'title',
            'type',
            'from',
            'to',
            'content',
        ]) as unknown as Promise<Record<string, string>>;
    }
}
