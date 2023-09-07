import _ from 'lodash';
import config from './lib/utils/config';
import Api from './lib/utils/api';

import Info from './lib/modules/info';
import Inbox from './lib/modules/inbox';
import Homework from './lib/modules/homework';
import Calendar from './lib/modules/calendar';

export class LibrusClient {
    // Properties
    public api = new Api();

    // Modules
    public info = new Info(this);
    public inbox = new Inbox(this);
    public homework = new Homework(this);
    public calendar = new Calendar(this);

    constructor(login?: string, password?: string) {
        if (login && password) this.login(login, password);
    }

    public async login(login: string, password: string): Promise<any> {


        return this.api.caller
            .get(
                'https://api.librus.pl/OAuth/Authorization?client_id=46&response_type=code&scope=mydata'
            )
            .then(() =>
                this.api.caller.postForm('https://api.librus.pl/OAuth/Authorization?client_id=46', {
                    action: 'login',
                    login,
                    pass: password,
                })
            )
            .then(
                async () =>
                    await this.api.caller
                        .get('https://api.librus.pl/OAuth/Authorization/2FA?client_id=46')
                        .then(async res => {
                            return {
                                cookies: await this.api.cookie.getCookies(config.default_url),
                                status: res.status,
                            };
                        })
            )
            .catch(err => {
                return {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    response: err.response.data,
                    axioserr: err,
                };
            });
    }
}
