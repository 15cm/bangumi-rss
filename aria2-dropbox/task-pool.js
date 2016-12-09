class TaskPool {
  constructor(max) {
    this._max = max
    this._cnt = 0
    this._waitQueue = []
  }

  check() {
    if(this.notFull() && this._waitQueue.length > 0) {
      let [f, args] = this._waitQueue.shift()
      this.apply(f, ...args)
    }
  }

  apply(f, ...args) {
    if(this.notFull()) {
      this._cnt += 1
      f(...args).then((output = '') => {
        this._cnt -= 1
        console.log('-------------------------------------------')
        console.log(output)
        console.log('-------------------------------------------\n')
        console.log('Task finished.', this._cnt ,'task running...')
        this.check()
      }).catch((err) => {
        console.log('Error with task:', err)
        this._cnt -= 1
        this.check()
      })
    } else {
      this._waitQueue.push([f, args])
      // console.log('waiting: ' + this._waitQueue.length)
    }
  }

  notFull() {
    return this._cnt < this._max
  }
}

module.exports = TaskPool
