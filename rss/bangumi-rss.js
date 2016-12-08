#!/usr/bin/env node

const print = console.log
const fs = require('fs')
const bgm = require('./bgm.js')
const Aria2 = require('aria2')
const schedule = require('node-schedule')
const _ = require('lodash')
const argv = require('yargs')
      .usage('Usage: $0 <command> [args]')
      .command('add <name> <rss>', 'Add a bangumi with rss url', {}, argv => bgm.add(argv.name, argv.rss))
      .example('$0 add oc9 \'https://www.nyaa.se/?page=rss&term=Horriblesubs+Occultic;Nine+(1080p)\'')
      .command('remove <name>', 'Remove a bangumi', {}, argv => bgm.remove(argv.name))
      .example('$0 remove oc9')
      .command('check [name]', 'Check new feeds for bangumi[s]', {}, argv => {
        if(argv.name) {
          bgm.check(argv.name).then(feeds => {
            sendToAria2(feeds)
          }).catch(err => {
            print(err)
          })
        } else {
          bgm.checkAll().then(res => {
            _.each(res, feeds => sendToAria2(feeds))
          }).catch(err => {
            print(err)
          })
        }
      })
      .example('$0 check oc9')
      .command('list [name]', 'List infos of bangumi[s]', {}, argv => {
        if(argv.name) {
          bgm.list(argv.name) 
        } else {
          bgm.listAll()
        }
      })
      .example('$0 list oc9')
      .command('schedule [cron]',
               'Schedule job of checking all new feeds with cron format (Recommend to launch using "pm2")',
               {},
               argv => {
                 var defaultValue = '* /30 * * * *'
                 print(`Schedule job: ${argv.cron || defaultValue}`)
                 var j = schedule.scheduleJob(argv.cron || defaultValue, () => {
                   print(`Scheduled checking run at ${(new Date()).toUTCString()}`)
                   bgm.checkAll().then(res => {
                     _.each(res, feeds => sendToAria2(feeds))
                   }).catch(err => {
                     print(err)
                   })
                 })
               })
      .example('$0 schedule "* /30 * * * *"')
      .epilog('copyright 15cm')
      .demand(1)
      .help()
      .argv

var config = JSON.parse(fs.readFileSync('./conf.json', 'utf8'))
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
