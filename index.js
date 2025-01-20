#!/usr/bin/env node

/**
 * @fileOverview mjson command-line
 * @name index.js
 * @author Kei Funagayama <kei.topaz@gmail.com>
 * @modifies Cellularhacker <wva3cdae@gmail.com>
 */

const fs = require('fs');
const {Command} = require('commander');
const jsonminify = require('jsonminify');
const colors = require('colors');
const jsonlint = require('jsonlint');

const packageJson = fs.readFileSync('package.json');
const VERSION = packageJson.version;

const cmd = new Command();

//////////

let debug = function () {
};

const isFileSync = function (p) {
    if (!fs.existsSync(p)) {
        return false;
    }
    const stats = fs.statSync(p);
    return stats.isFile();
};

const readJsonSync = function (path, encoding = 'utf-8') {
    return fs.readFileSync(path, encoding);
};

const minify = function (raw, color) {
    let output = '';
    raw = jsonminify(raw);
    const indent = cmd.getOptionValue('indent');

    try {
        output = JSON.stringify(JSON.parse(raw), null, indent);
    } catch (e1) {
        try {
            jsonlint.parse(raw);
        } catch (e2) {
            throw e2;
        }
    }
    if (color) {
        debug('color on');
        output = output.replace(/"(.*?)"/g, "\"$1\"".green);
        //output = output.replace(/\"(.*?)\"/g, colors['red']("\"$1\""));
    } else {
        debug('color off');
    }
    return output;

};

//////////

/**
 * STDIN -> STDOUT
 */
const stdin2stdout = function () {
    let stdin = '';
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', function (chunk) {
        stdin += chunk;
        debug(chunk);
    });

    process.stdin.on('end', function () {
        const output = minify(stdin, true);
        process.stdout.write(output);
    });
    return 0;
};

/**
 * FILE -> STDOUT
 */
const file2stdout = function (path) {
    if (path) {
        cmd.setOptionValue('src', path);
    }
    const cmdSrc = cmd.getOptionValue('src');

    if (!isFileSync(cmdSrc)) {
        console.error('--src or -s file can not be read. --src:', cmdSrc);
        return 2;
    }
    let output = readJsonSync(cmdSrc);
    output = minify(output, true);
    process.stdout.write(output);

    return 0;
};

/**
 * FILE -> FILE
 */
const file2file = function () {
    const cmdSrc = cmd.getOptionValue('src');

    if (!isFileSync(cmdSrc)) {
        console.error('--src or -s file can not be read. --src:', cmdSrc);
        return 2;
    }
    const cmdOut = cmd.getOptionValue('out');
    const cmdEncode = cmd.getOptionValue('encode');

    let output = readJsonSync(cmdSrc, cmdEncode);
    output = minify(output, false);

    // write
    debug('-- data start');
    debug(output);
    debug('-- data end');

    if (cmd.getOptionValue('force')) {
        debug('Overwrite remove output file. path:', cmdOut);
        fs.unlinkSync(cmdOut);
    }

    if (isFileSync(cmdOut)) {
        console.error('--out or -o file already exists --out:', cmdOut);
        return 2;
    }

    fs.writeFileSync(cmdOut, output, cmdEncode);
    console.info('output:', cmdOut);

    return 0;
};

//////////

const main = exports.main = function main() {
    colors.setTheme({
        silly: 'rainbow',
        input: 'grey',
        verbose: 'cyan',
        prompt: 'grey',
        info: 'green',
        data: 'grey',
        help: 'cyan',
        warn: 'yellow',
        debug: 'blue',
        error: 'red',
        err: 'red',
        title: 'yellow'
    });

    cmd
        .version(VERSION)
        .description('Formatted output to the standard output, standard input (string JSON)')
        .option('-d --debug', 'debug mode')
        .option('-C --color', 'color mode')
        .option('-i --indent <indent>', 'indent string (default: space 4)', String, '    ')
        .option('-s --src <src>', 'Read file path', String)
        .option('-o --out <out>', 'Write file path', String)
        .option('-e --encode <encode>', 'Read/Write file encode. default) utf-8', String, 'utf-8')
        .option('-f --force', 'Overwrite output file')
        .parse(process.argv)
    ;
    if (cmd.getOptionValue('debug')) {
        debug = function () {
            let msg = "";
            const ary = Array.prototype.slice.call(arguments);
            for (let i = 0; i < ary.length; i++) {
                0 < i ? msg += ' ' + ary[i] : msg += ary[i];
            }

            console.error('debug:'.debug, msg);
        };
        //debug = debug;
        console.info("info:".info, "debug mode.");
    }

    let ret = 0;
    const cmdSrc = cmd.getOptionValue('src');
    const cmdOut = cmd.getOptionValue('out');

    //console.log(commander);
    if (0 < cmd.args.length) {
        debug('select file2stdout args');
        ret = file2stdout(cmd.args[0]);
        process.exit(ret);
    } else if (cmdSrc && cmdOut) {
        debug('select file2file');
        ret = file2file();
        process.exit(ret);
    } else if (cmdSrc) {
        debug('select file2stdout');
        ret = file2stdout();
        process.exit(ret);
    } else {
        debug('select stdin2stdout');
        ret = stdin2stdout();
        // process.exit(ret); // pipe background
    }
};

main(); // main()
