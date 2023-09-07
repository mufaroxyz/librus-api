import { CheerioAPI, load } from 'cheerio';
import { LibrusClient } from '../..';
import Module from '../utils/Module';
import { Message, ReceiverType } from '../../types';
import _ from "lodash";

export default class Inbox extends Module {
    constructor(client: LibrusClient) {
        super(client);
    }

    static async getConfirmationMessage($: CheerioAPI) {
        new Promise((resolve, reject) => {
            const message = $('.green.container').text().trim();
            message.length ? resolve(message) : reject('No confirmation message found');
        });
    }

    public async fetchMessage(folderId: string, messageId: string): Promise<Message> {
        const endpoint = `wiadomosci/1/${folderId}/${messageId}`;
        return this.client.api.singleMapper(
            endpoint,
            'table.stretch.container-message td.message-folders+td',
            ($: CheerioAPI, row: any) => {
                const table = $(row).find('table:nth-child(2)>tbody');

                const values: string[] = [];
                table.find("tr").each((_, row) => {
                    const value = $(row).find('td:nth-child(2)').text().trim();
                    values.push(value);
                })
                const header = _.zipObject(['user', 'title', 'date'], values);
                const attachmentPaths = $(row)
                    .find('img[src*=download]')
                    .map((_, e) =>
                        $(e)
                            .attr('onclick')
                            ?.match(/[^"]+wiadomosci[^"]+/)?.[0]
                            .replace(/\\/g, '')
                            .replace(/^\//, '')
                    );
                const attachment = $(row)
                    .find('img[src*=filetype]')
                    .map((_, e) => $(e).parent()?.text()?.trim())
                    .map((i, e) => {
                        return {
                            name: e,
                            path: attachmentPaths[i],
                        };
                    })
                    .get();

                return {
                    id: messageId,
                    folderId: folderId,
                    url: endpoint,
                    ...header,
                    files: attachment,
                    content: $(row).find('.container-message-content').html(),
                    html: $(row).find('.container-message-content').text(),
                    read: $(row).find('td.left').last().text().trim() !== 'NIE',
                };
            }
        ) as unknown as Message;
    }

    public async removeMessage(messageId: string, folderId: string): Promise<void> {
        const reqData = new FormData();
        reqData.append('wiadomosciLista[]', messageId);
        reqData.append('folder', folderId);
        reqData.append('czyArchiwum', '0');
        return this.client.api.caller
            .post('https://synergia.librus.pl/usun_wiadomosc', reqData)
            .catch(error => {
                console.log(error);
                return error;
            });
    }

    public async sendMessage(userId: string | string[], title: string, content: string) {
        const reqData = new FormData();
        for (const id of Array.isArray(userId) ? userId : [userId]) {
            reqData.append('DoKogo[]', id);
        }
        reqData.append('temat', title);
        reqData.append('tresc', content);
        reqData.append('poprzednia', '6');
        reqData.append('wyslij', 'Wy%C5%9Blij');
        return this.client.api.caller
            .get('https://synergia.librus.pl/wiadomosci/2/5')
            .then(() =>
                this.client.api.caller.post('https://synergia.librus.pl/wiadomosci/5', reqData)
            );
    }

    public async getMessages(folderId?: string): Promise<any> {
        const parser = ($: CheerioAPI, row: any) => {
            const children = $(row).children();
            return {
                id: parseInt($(children[3]).find('a').attr('href')?.split(/[/]/)[4] || '-1'),
                user: $(children[2]).text().trim(),
                title: $(children[3]).text().trim(),
                date: $(children[4]).text().trim(),
                read: $(children[5]).attr('style') != 'font-weight: bold;',
            };
        };

        return this.client.api.mapper(
            `wiadomosci${folderId ? `/${folderId}` : ''}`,
            'table.container-message table.decorated.stretch tbody tr',
            parser,
            'GET'
        );
    }

    public async getSentMessages() {
        return this.getMessages('6');
    }

    public async getReceivers(receiverType: ReceiverType) {


        const reqData = new FormData();
        reqData.append('typAdresata', receiverType);
        reqData.append('poprzednia', '5');
        reqData.append('idGrupy', '0');

        const parser = ($: CheerioAPI, row: string) => {
            return {
                id: parseInt($(row).find("input[name='DoKogo[]']").val() as string) || -1,
                user: $(row).find('label').text().trim(),
            };
        };
        return this.client.api.mapper(
            'getRecipients',
            "table.message-recipients-detail tr[class*='line']",
            parser,
            'POST',
            reqData
        ) as unknown as Array<{ id: number; user: string }>;
    }

    public async getAnnouncements(): Promise<any> {
        return this.client.api.mapper(
            'ogloszenia',
            'div#body div.container-background table.decorated',
            ($: CheerioAPI, row: any) => {
                let cols = $(row).find('td');
                return {
                    title: $(cols[0]).find('thead').text().trim(),
                    user: $(cols[1]).text().trim(),
                    date: $(cols[2]).text().trim(),
                    content: $(cols[3]).text().trim(),
                };
            }
        );
    }
}
