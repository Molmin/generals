import { } from '../lib/jquery'

const clickEvents: ((ev: JQuery.ClickEvent) => void)[] = []

export class Alert {
  $ele = $('.alert')

  constructor(
    title: string,
    description: string,
    options: Array<{
      text: string,
      class: string,
      key: string,
    }>,
  ) {
    $('h1.alert-title').text(title)
    $('p.alert-description').html(description)
    for (const option of options) {
      $('.alert > center').append(`<div class="button-div"><button class="${option.class}" data-key="${option.key}">${option.text}</button></div>`)
    }
  }

  open() {
    return new Promise((resolve) => {
      this.$ele.removeClass('hidden')
      clickEvents.push((ev) => {
        const target = $(ev.currentTarget)
        if (target.attr('data-key')) {
          this.$ele.addClass('hidden')
          this.$ele.find('div.button-div').remove()
          resolve(target.attr('data-key'))
        }
      })
    })
  }
}

export function registerAlertEvent() {
  $(document).on('click', '.alert button', (ev) => {
    clickEvents.forEach((fn) => fn(ev))
  })
}
