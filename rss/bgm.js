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
      id: Number,
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
  bgms: [],
  bgmNum: 0
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
  var id = db.get('bgmNum').value()
  db.get('bgms')
    .push({
      id: id,
      name: bgmName,
      rss: rssUrl,
      feeds: []
    })
    .value()
  db.set('bgmNum', id + 1).value()
}

function remove(bgmId) {
  db.get('bgms').remove({ id: bgmId}).value()
  bgmNumOld = db.get('bgmNum').value()
  db.set('bgmNum', bgmNumOld - 1).value()
}

function removeall() {
  db.get('bgms').remove().value()
}

function update(bgmId, bgmInfos) {
  var bgm = db.get('bgms').find({id: bgmId})
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

function check(bgmId) {
  return new Promise((resolve, reject) => {
    if(db.get('bgms').findIndex({ id: bgmId }).value() < 0)
      reject(`Bangumi "${bgmId}" not found. Use 'bgm-rss list' to show bangumis`)
    var findBgmById = db.get('bgms').find({id: bgmId})
    var rssUrl = findBgmById.get('rss').value()
    var bgmName = findBgmById.get('name').value()
    request(rssUrl, (err, res, body) => {
      if(err || res.statusCode != 200)
        reject(`${res.statusCode}: ${err}`)
      var newFeeds = update(bgmId, parseFeedsFromRss(body))
      print(`Bangumi "${bgmName}" checked, ${newFeeds.length} new feeds found.`)
      resolve(newFeeds)
    })
  })
}

function checkAll() {
  return Promise.all(db.get('bgms').map(({id}) => check(id)).value())
}

// List all bgm infos and latest bangumi title
function listAll() {
  var bgms = db.get('bgms').map(({id, name, rss, feeds}) => {
    let feed = feeds.length > 0 ? feeds[0] : {title: 'Yet', addedAt: 'Yet'}
    return {
      id,
      name,
      rss,
      latest: feed.title,
      addedAt: feed.addedAt
    }
  })
  for(let {id, name, rss, latest, addedAt} of bgms) {
    print(`ID:    : ${id}`)
    print(`Name   : ${name}`)
    print(`RSS    : ${rss}`)
    print(`Latest : ${latest}`)
    print(`AddedAt: ${addedAt}`)
    print()
  }
}

// Show detail of a bgm
function list(bgmId) {
  if(db.get('bgms').findIndex({id: bgmId}).value() < 0)
    throw (`Bangumi "${bgmId}" not found. Use 'bgm-rss list' to show bangumis`)
  print(db.get('bgms').find({id: bgmId}).value())
}

exports.add = add
exports.remove = remove
exports.removeall = removeall
exports.check = check
exports.checkAll = checkAll
exports.listAll = listAll
exports.list = list
