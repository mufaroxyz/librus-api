import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import _ from 'lodash';
import * as cheerio from 'cheerio';

import axios from 'axios';
import config from './config';
import { RESTMethod } from '../../types';

type Callback = (...args: any[]) => any;

export default class Api {
    public singleMapper;
    public tableMapper;
    public caller;
    public config = config;
    public cookie = new CookieJar();

    constructor() {
        this.caller = wrapper(
            axios.create({
                jar: this.cookie,
                withCredentials: true,
                headers: {
                    'User-Agent':
                        'User-Agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.73 Safari/537.36',
                },
            })
        );

        this.singleMapper = _.wrap(this.mapper, async (fn, ...args) => {
            const result = await fn.apply(
                this,
                args as [
                    endpoint: string,
                    cssPath: string,
                    parser: Callback,
                    method: RESTMethod,
                    data: FormData
                ]
            );
            return _.first(result);
        });

        this.tableMapper = _.wrap(this.singleMapper, (fn, ...args: unknown[]) => {
            let keys = _.last(args) as string[];

            let argArr = args
                .filter((_, i) => {
                    return i !== args.length - 1;
                })
                .concat([
                    (_: unknown, table: string) => {
                        return this.mapTableValues(table, keys);
                    },
                ]);

            return fn.apply(this, argArr);
        });

        /**
         *  Old code, kept in case the new one doesn't work, as it treated ...args as never[]
         *  so it had to be changed to unknown[]
         */

        // this.tableMapper = _.wrap(this.singleMapper, fn => {
        //     let keys = _.last(arguments) as string[],
        //         args = _.chain(arguments);

        //     let argArr = args
        //         .remove((_, i) => {
        //             return i && i !== arguments.length - 1;
        //         })
        //         .concat([
        //             (_: unknown, table: string) => {
        //                 return this.mapTableValues(table, keys);
        //             },
        //         ])
        //         .value();

        //     return fn.apply(this, argArr);
        // });
    }

    public request = async (method: RESTMethod, endpoint: string, data: any = undefined) => {
        return await this.caller
            .request({
                method,
                url: endpoint.startsWith('https://')
                    ? endpoint
                    : this.config.default_url + endpoint,
                data,
            })
            .then(({ data }) => cheerio.load(data));
    };

    static arrayMapper($: Function, parser: any, cssPath: string) {
        return _.compact(_.map($(cssPath), _.partial(parser, $)));
    }

    public async mapper(
        endpoint: string,
        cssPath: string,
        parser: Callback,
        method: RESTMethod = 'GET',
        data: any = undefined
    ) {
        return await this.request(method, endpoint, data).then($ => {
            return Api.arrayMapper($, parser, cssPath);
        });
    }

    public mapTableValues(table: string, keys: string[]): { [k: string]: any } {
        const $ = cheerio.load(table);
        const values: any[] = [];
        $('tr').each((_, row) => {
            const value = $(row).find('td:nth-child(2)').text().trim();
            values.push(value);
        });
        return _.zipObject(keys, values);
    }

    static tableValues(table: string): { [k: string]: any } {
        const $ = cheerio.load(table);
        const rows: any[] = [];
        $('tr').each((_, row) => {
            const key = $(row).children().eq(0).text().trim();
            const value = $(row).children().eq(1).text().trim();
            rows.push([key, value]);
        });
        return _.fromPairs(rows);
    }

    // $("string").text().trim()
    public cheerioTrimmed = (element: cheerio.Cheerio<cheerio.AnyNode>) => {
        return element.text().trim();
    };
}
