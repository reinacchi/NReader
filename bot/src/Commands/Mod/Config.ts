import {  ReaderCommand, ReaderInterface } from "reader-framework";

export const command: ReaderInterface.ICommand = {
    name: "config",
    description: "Configure the bot settings",
    type: 1,
    options: [
        {
            name: "language",
            description: "Configure the language used in this guild",
            type: 1,
            options: [
                {
                    name: "language",
                    description: "The language to set",
                    type: 3,
                    required: true,
                    /* @ts-ignore */
                    choices: [
                        {
                            name: "English",
                            value: "en"
                        },
                        {
                            name: "Japanese",
                            value: "ja"
                        }
                    ]
                }
            ]
        }
    ],
    run: async (payload) => {
        return new ReaderCommand(payload).configCommand();
    }
}