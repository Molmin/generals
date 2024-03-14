import superagent from 'superagent'

let name = ''
let uid = 0
let token = ''
let isAdmin = false

export class UserService {
  static get uname() { return name }
  static get uid() { return uid }
  static get token() { return token }

  static set token(val: string) {
    token = val
    window.localStorage.setItem('player-id', val)
  }

  static async init() {
    token = window.localStorage.getItem('player-id') || ''
    const { body } = await superagent.post('/user/current')
      .send({ token: UserService.token })
    if (body.loggedIn) {
      name = body.name
      uid = body.uid
      isAdmin = body.isAdmin
      if (isAdmin) $('body').addClass('isadmin')
      if (window.location.pathname === '/login') {
        window.location.pathname = '/'
      }
    }
    else {
      UserService.token = ''
      if (window.location.pathname !== '/login') {
        window.location.pathname = '/login'
      }
    }
  }
}
