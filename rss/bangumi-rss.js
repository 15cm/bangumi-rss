#!/usr/bin/env node

const print = console.log
const fs = require('fs')
const path = require('path')
const bgm = require('./bgm.js')
const Aria2 = require('aria2')
const schedule = require('node-schedule')
const _ = require('lodash')
const NAME = path.basename(__filename, '.js')
const argv = require('yargs')
      .usage(`Usage: ${NAME} <command> [args]`)
      .boolean('nd')
      .describe('nd', "Not download. '--nd' means not send new feeds to Aria2")
      .command('add <name> <rss>', 'Add a bangumi with rss url', {}, argv => bgm.add(argv.name, argv.rss))
      .example(`${NAME} add oc9 'https://www.nyaa.se/?page=rss&term=Horriblesubs+Occultic;Nine+(1080p)'`)
      .command('remove <name>', 'Remove a bangumi', {}, argv => bgm.remove(argv.name))
      .example(`${NAME} remove oc9`)
      .command('check [name] [option]', 'Check new feeds for bangumi[s]', {}, argv => {
        var isDownload = !argv.nd
        if(argv.name) {
          checkFeed(argv.name, isDownload)
        } else {
          checkFeedAll(isDownload)
        }
      })
      .example(`${NAME} check oc9`)
      .command('list [name]', 'List infos of bangumi[s]', {}, argv => {
        if(argv.name) {
          bgm.list(argv.name) 
        } else {
          bgm.listAll()
        }
      })
      .example(`${NAME} list oc9`)
      .command('schedule [cron] [option]',
               'Schedule job of checking all new feeds with cron format(Default: check every 30 min)',
               {
                 cron: { default:  "*/30 * * * *" }
               },
               argv => {
                 var isDownload = !argv.nd
                 print(`Scheduled checking: ${argv.cron}`)
                 print(`Send to Aria2: ${isDownload}`)
                 var j = schedule.scheduleJob(argv.cron, () => {
                   print(`Scheduled checking run at ${(new Date()).toUTCString()}`)
                   checkFeedAll(isDownload)
                 })
               })
      .example(`${NAME} schedule`)
      .epilog('copyright 15cm')
      .demand(1)
      .help()
      .argv

var config = JSON.parse(fs.readFileSync(path.join(__dirname,'conf.json'), 'utf8'))
var aria2 = new Aria2(config.aria2)

function sendToAria2(feeds) {
  _.each(feeds, ({title, url}) => {
    aria2.addUri([url])
      .then(res => {
      print(`${title} sent to Aria2: ${res}`)
      }).catch(err => {
        print(err)
      })
  })
}

function checkFeed(bgmName, isDownload = true) {
  bgm.check(bgmName).then(feeds => {
    if(isDownload) sendToAria2(feeds)
  }).catch(err => {
    print(err)
  })
}

function checkFeedAll(isDownload = true) {
  bgm.checkAll().then(res => {
    if(isDownload) _.each(res, feeds => sendToAria2(feeds))
  }).catch(err => {
    print(err)
  })
}
