type GeneralKey =
    "general.help.description" |
    "general.help.nsfw" |
    "general.help.search.name" |
    "general.help.search.value" |
    "general.help.title" |
    "general.help.usage.name" |
    "general.help.usage.value" |
    "general.ping" |
    "general.register" |
    "general.stats.cpu" |
    "general.stats.memory" |
    "general.stats.platform" |
    "general.stats.server" |
    "general.stats.title" |
    "general.stats.uptime" |
    "general.stats.user";

type MainKey =
    "main.artist" |
    "main.artists" |
    "main.bookmark" |
    "main.bookmark.maxed" |
    "main.bookmark.none" |
    "main.bookmark.removed" |
    "main.bookmark.saved" |
    "main.bookmark.title" |
    "main.character" |
    "main.characters" |
    "main.cover.hide" |
    "main.cover.show" |
    "main.detail" |
    "main.error" |
    "main.home" |
    "main.language" |
    "main.languages" |
    "main.none" |
    "main.noperms" |
    "main.page" |
    "main.page.enter" |
    "main.page.enter.hint" |
    "main.page.enter.invalid" |
    "main.page.enter.unknown" |
    "main.page.first" |
    "main.page.last" |
    "main.page.next" |
    "main.page.previous" |
    "main.pages" |
    "main.parodies" |
    "main.parody" |
    "main.original" |
    "main.read" |
    "main.read.none" |
    "main.released" |
    "main.result.enter" |
    "main.result.enter.hint" |
    "main.result.enter.invalid" |
    "main.result.enter.unknown" |
    "main.result.first" |
    "main.result.last" |
    "main.result.next" |
    "main.result.previous" |
    "main.search.empty" |
    "main.search.none" |
    "main.stop" |
    "main.tag" |
    "main.tags" |
    "main.tags.restricted" |
    "main.timeout" |
    "main.title";

type ModKey =
    "mod.language.set" |
    "mod.noperms";

export type TranslationKey = GeneralKey | MainKey | ModKey;
