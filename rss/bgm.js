const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const request = require('request')
const low = require('lowdb')
const _ = require('lodash')
const print = console.log

/*
  Sync read & write
  db: {
    bgms: [{
      name: '',
      rss: '',
      feeds: [{
        title: '',
        url: '',
       addedAt: ''
      }, ...]
    }, ...]
  }
  */
const db = low(path.join(__dirname, 'db.json'))
db.defaults({
  bgms: []
}).value()

/*
  feed:
  {
    title,
    url
  }
*/
function parseFeedsFromRss(rssString) {
  const $ = cheerio.load(rssString, {
    xmlMode: true
  })
  return $('item').map((i, e) => {
    return {
      title: $(e).find('title').text(),
      url: $(e).find('link').text()
    }
  }).get()
}

function add(bgmName, rssUrl) {
  if(db.get('bgms').findIndex({name: bgmName}).value() >= 0)
    throw `Bangumi "${bgmName}" has already in list.`
  db.get('bgms')
    .push({
      name: bgmName,
      rss: rssUrl,
      feeds: []
    })
    .value()
}

function remove(bgmName) {
  db.get('bgms').remove({ name: bgmName}).value()
}

function update(bgmName, bgmInfos) {
  var bgm = db.get('bgms').find({ name: bgmName })
  var feeds = bgm.get('feeds')
  var feedTitles = feeds.map('title').value()
  var newFeeds = _.differenceWith(bgmInfos, feedTitles, (info, title) => {
    return info['title'] == title
  })
  bgm.set('feeds', _.concat(_.map(newFeeds, ({title, url}) => {
    return {
      title,
      url,
      addedAt: (new Date()).toUTCString()
    }
  }), feeds.value())).value()
  return newFeeds
}

function check(bgmName) {
  return new Promise((resolve, reject) => {
    if(db.get('bgms').findIndex({ name: bgmName }).value() < 0)
      reject(`Bangumi "${bgmName}" not found. Use 'bgm-rss list' to show bangumis`)
    var rssUrl = db.get('bgms').find({ name: bgmName}).get('rss').value()
    request(rssUrl, (err, res, body) => {
      if(err || res.statusCode != 200)
        reject(`${res.statusCode}: ${err}`)
      var newFeeds = update(bgmName, parseFeedsFromRss(body))
      print(`"${bgmName}" checked, ${newFeeds.length} new feeds found.`)
      resolve(newFeeds)
    })
  })
}

function checkAll() {
  return Promise.all(db.get('bgms').map(({name}) => check(name)).value())
}

// List all bgm infos and latest bangumi title
function listAll() {
  var bgms = db.get('bgms').map(({name, rss, feeds}) => {
    let feed = feeds.length > 0 ? feeds[0] : {title: 'Yet', addedAt: 'Yet'}
    return {
      name,
      rss,
      latest: feed.title,
      addedAt: feed.addedAt
    }
  })
  for(let {name, rss, latest, addedAt} of bgms) {
    print(`Name   : ${name}`)
    print(`RSS    : ${rss}`)
    print(`Latest : ${latest}`)
    print(`AddedAt: ${addedAt}`)
    print()
  }
}

// Show detail of a bgm
function list(bgmName) {
  if(db.get('bgms').findIndex({ name: bgmName }).value() < 0)
    throw (`Bangumi "${bgmName}" not found. Use 'bgm-rss list' to show bangumis`)
  print(db.get('bgms').find({ name: bgmName}).value())
}

exports.add = add
exports.remove = remove
exports.check = check
exports.checkAll = checkAll
exports.listAll = listAll
exports.list = list
