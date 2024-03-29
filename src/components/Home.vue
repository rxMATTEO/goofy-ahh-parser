<script setup lang="ts">
import axios from "axios";
import {computed, inject, onMounted, Ref, ref} from "vue";
import {FilterMatchMode} from "primevue/api";
import {useConfirm} from "primevue/useconfirm";
import {useRoute, useRouter} from "vue-router";
import {median} from "../stuff/median.ts";
import avg from "../stuff/avg.ts";
import late from "../stuff/late.ts";
import sum from "../stuff/sum.ts";
import {useToast} from "primevue/usetoast";
import nabuhal from "../stuff/nabuhal.ts";

type DateInfo = {
  [k in string]: Info[]
}

type Info = {
  date: string;
  exit: string;
  keyLabel: string;
  pass: string;
  time: string;
  type: string;
}

type Person = {
  firstName: string
  lastName: string
  middleName: string
  page: string
  pageNumber: string
  room: string
  rows: string[]
  info: Info[]
  dates: {
    DateInfo
  }
}

const body = ref(null);
const info = ref(null);
const people: Ref<Person[] | null> = ref(null);
const error = ref(null);
const confirm = useConfirm();
const reports = ref<{
  name: string
}[] | null>(null);

const api = inject('apiUrl');
const route = useRoute();
onMounted(async () => {
  try {
    body.value = (await axios.get(`${api}/ping`)).data;
  } catch {
    error.value = 'Не удалось подключиться к серверу. Попробуй его запустить: npm run server';
  }
  const {report} = route.query;
  const queryParams = report ? `?report=${report}` : ``;
  info.value = (await axios.get(`${api}/info${queryParams}`)).data;
  console.log(info.value);
  console.log(((await axios.get(`${api}/people${queryParams}`)).data));
  reports.value = await getLastReports();
  people.value = (((await axios.get(`${api}/people${queryParams}`)).data) as Person[]).map(
      (person: Person) => {
        return {
          ...person,
          fullName: person.lastName + ' ' + person.firstName + ' ' + person.middleName,
          info: person.info.map(
              ([date, keyLabel, time, exit, type, pass, k]) => {
                return {
                  date,
                  keyLabel,
                  time,
                  exit,
                  type,
                  pass: pass || k ? `${pass} ${k}` : undefined
                }
              }
          ).map(obj => {
                Object.keys(obj).forEach(key => {
                  if (obj[key] === undefined) {
                    delete obj[key];
                  }
                });
                return obj;
              }
          )
        }
      }
  );

  if(people.value?.length === 0 || !info.value){
    error.value = 'Список отчетов пуст. Загрузите новый';
    return;
  }

  people.value?.map(chel => {
    chel.dates = {};
    chel.info.forEach((info, index, array) => {
      if (!info.date) return;
      const chelDates = chel.dates[info.date];
      if (!info.type) {
        array[index + 1].type = info.date;
        info.date = null;
      }
      if (chelDates) {
        chel.dates[info.date].push(info);
      } else {
        chel.dates[info.date] = [info];
      }
    });
    chel.dates = Object.fromEntries(Object.entries(chel.dates).filter(([k, v]) => {
      return k != "null";
    }));
    return chel;
  });
  people.value.forEach(chel => {
    if (Object.keys(chel.dates).length > 0) {
      chel.fullFormatted = Object.entries(chel.dates).map(([date, data]) => formateDate(data));
      const nabuhalTime = nabuhal(chel.fullFormatted.map(i => i.overworked).filter(i => i.hours >= 0 && i.minutes >= 0));
      const nabuhalNormilized = normilizeDate(convertMinsToHrsMins( nabuhalTime.hours * 60 + nabuhalTime.minutes ))
      chel.nabuhal = `${nabuhalNormilized.hours} часов ${nabuhalNormilized.minutes} минут`;
      chel.median = normilizeDate(convertMinsToHrsMins(median(chel.fullFormatted.map(el => (el.notExisted.hours) * 60 + el.notExisted.minutes)))).str;
      chel.avg = normilizeDate(convertMinsToHrsMins(avg(chel.fullFormatted.map(el => (el.notExisted.hours) * 60 + el.notExisted.minutes)).toFixed(0))).str;
      chel.lateTimes = (late(Object.entries(chel.dates).map(([date, data]) => {
        return normilizeDate(data[0].time);
      })));
      // chel.late = normilizeDate(convertMinsToHrsMins(late() );
      chel.fullInfo = getStatsForAll(chel.dates);
      chel.enterTimes = sum(Object.entries(chel.dates).map(([_, dates]) => dates.filter(el => el.type === 'ВХОД').length));
    }
  });
  people.value = people.value.filter(chel => chel.info.length > 0);
  info.value.workDays = Math.max(...people.value?.map(chel => Object.entries(chel.dates).length));
  console.log(people.value);
});

const columns = computed(() => {
  return {
    fullName: {
      header: 'ФИО',
      field: 'fullName'
    },
    notExistedMedian: {
      header: 'Отсутствовал, мед.',
      field: 'median',
    },
    notExistedAvg: {
      header: 'Отсутствовал, ср.',
      field: 'avg',
    },
    workedSum: {
      header: 'Работал, всего',
      field: 'fullInfo.worked.str'
    },
    notExistedAll: {
      header: 'Отсутствовал, всего',
      field: 'fullInfo.notExisted.str'
    },
    nabuhal: {
      header: 'Набухал, всего',
      field: 'nabuhal'
    },
    late: {
      header: "Опоздал, раз",
      field: 'lateTimes',
    },
    entranceQuantity: {
      header: 'Вошел, раз',
      field: 'enterTimes'
    }
    // firstName: 'Имя',
    // middleName: 'Отчество',
    // page: 'Страница',
    // pageNumber: 'Номер страницы',
    // room: 'Комната',
    // rows: 'Строки',
    // info: 'Информация (входы-выходы)',
  };
});

const rowsPerPage = computed(() => {
  return [10, 20, 50];
});

const filters = ref({
  global: {value: null, matchMode: FilterMatchMode.CONTAINS},
  fullName: {value: null, matchMode: FilterMatchMode.CONTAINS},
  firstName: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
  lastName: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
  middleName: {value: null, matchMode: FilterMatchMode.IN},
  page: {value: null, matchMode: FilterMatchMode.EQUALS},
  pageNumber: {value: null, matchMode: FilterMatchMode.EQUALS},
  room: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
  info: {value: null, matchMode: FilterMatchMode.IN},
  rows: {value: null, matchMode: FilterMatchMode.STARTS_WITH},
});

const expandedPeople = ref(null);

const expandAll = () => {
  expandedPeople.value = people.value?.filter((p) => p.firstName);
};
const collapseAll = () => {
  expandedPeople.value = null;
};

const eventTypeMatch = (k: string) => ({
  date: "Дата",
  keyLabel: "Ключ",
  time: "Время прохода",
  exit: "Проходная",
  type: "Тип",
  pass: 'Ключ'
}[k]);

function formateDate(info: Info[]) {
  const firstEnter = info[0].time;
  const lastExit = info[info.length - 1].time;

  if (!firstEnter || !lastExit) {
    return {
      late: 'Неизвестно'
    }
  }

  let difference = (getDate(lastExit) - getDate(firstEnter));


  // console.log(info.slice(1, -1), info)

  const allexitsSum = info.filter((inf, index) => (index % 2 === 0));
  const allNonExist = info.filter((inf, index) => index !== 0 && (index % 2 !== 0));

  let sum = {hours: 0, minutes: 0};
  const allExistLookup = allexitsSum.slice(1);
  const allNonExistLookup = allNonExist.slice(0, -1);
  for (let i = 0; i < allExistLookup.length; i++) {
    if (!allExistLookup[i] || !allNonExistLookup[i]) break;
    const {hours, minutes} = getResultFromDate(getDate(allExistLookup[i].time) - getDate(allNonExistLookup[i].time));
    sum.minutes += minutes;
    sum.hours += hours;
  }
  const sumNormilized = convertMinsToHrsMins((sum.hours * 60) + sum.minutes);
  // console.log(new Date(allexitsSum))

  const result = getResultFromDate(Math.abs(getDate(firstEnter) - getDate("9:00")));
  getDate(firstEnter) - getDate("9:00") < 0 ? result.str = `Пришел раньше на:` : result.str = 'Опоздал на:';
  result.str += ` ${result.hours} часов(а) ${result.minutes} минут`;
  const result2 = getResultFromDate(getDate(firstEnter) - getDate("9:00"))
  result2.str = result.str;
  return {
    // allTime: result,
    enter: firstEnter,
    exit: lastExit,
    worked: getResultFromDate(difference),
    late: result2,
    overworked: getResultFromDate(getDate(lastExit) - getDate("19:00")),
    notExisted: normilizeDate(sumNormilized)
  };
}

function getStatsForAll(dates: Info[]) {
  const val = Object.entries(dates).map(([date, data]) => formateDate(data)).reduce((previousValue, currentValue) => {
    return {
      ...previousValue,
      worked: {
        hours: (+previousValue.worked.hours) + (+currentValue.worked.hours),
        minutes: (+previousValue.worked.minutes) + (+currentValue.worked.minutes),
        str: (+previousValue.worked.hours) + (+currentValue.worked.hours) + ':' + (+previousValue.worked.minutes) + (+currentValue.worked.minutes)
      },
      notExisted: {
        hours: (+previousValue.notExisted.hours) + (+currentValue.notExisted.hours),
        minutes: (+previousValue.notExisted.minutes) + (+currentValue.notExisted.minutes),
        str: (+previousValue.notExisted.hours) + (+currentValue.notExisted.hours) + ":" + (+previousValue.notExisted.minutes) + (+currentValue.notExisted.minutes)
      },
      late: {
        hours: (+previousValue.late.hours) + (+currentValue.late.hours),
        minutes: (+previousValue.late.minutes) + (+currentValue.late.minutes),
        str: (+previousValue.late.hours) + (+currentValue.late.hours) + ":" + (+previousValue.late.minutes) + (+currentValue.late.minutes)
      },
      overworked: {
        hours: (+previousValue.overworked.hours) + (+currentValue.overworked.hours),
        minutes: (+previousValue.overworked.minutes) + (+currentValue.overworked.minutes),
        str: (+previousValue.overworked.hours) + (+currentValue.overworked.hours) + ":" + (+previousValue.overworked.minutes) + (+currentValue.overworked.minutes)
      }
    };
  });
  const worked = normilizeDate(convertMinsToHrsMins((val.worked.hours * 60) + val.worked.minutes));
  const lateHours = (val.late.hours < 0) ? val.late.hours * -1 : val.late.hours;
  const lateMinutes = (val.late.minutes < 0) ? val.late.minutes * -1 : val.late.minutes;
  const late = normilizeDate(convertMinsToHrsMins((lateHours * 60) + lateMinutes));
  late.str = (val.late.minutes < 0) || (val.late.hours < 0) ? `Пришел раньше на: ${late.hours} часов(а) ${late.minutes} минут` : `Опоздал на: ${late.hours} часов(а) ${late.minutes} минут`;
  const notExisted = normilizeDate(convertMinsToHrsMins((val.notExisted.hours * 60) + val.notExisted.minutes));
  val.worked = worked;
  val.late = late;
  val.notExisted = notExisted;
  return val;
}

function getDate(date: string) {
  return new Date(0, 0, 0, date.split(':')[0], date.split(':')[1]);
}

function normilizeDate(date: string) {
  const hours = +date.split(':')[0];
  const minutes = +date.split(':')[1];
  return {
    hours,
    minutes,
    str: `${hours} часов ${minutes} минут`,
    positiveStr: `${hours * -1} часов ${minutes * -1} минут`
  };
}

function getResultFromDate(date: string) {
  const hours = Math.floor((date % 86400000) / 3600000);
  const minutes = Math.round(((date % 86400000) % 3600000) / 60000);
  return {
    hours,
    minutes,
    str: `${hours}:${minutes}`,
    positiveStr: `${hours * -1}:${minutes * -1}`
  };
}

function convertMinsToHrsMins(minutes) {
  let h = Math.floor(minutes / 60);
  let m = minutes % 60;
  h = h < 10 ? '0' + h : h;
  m = m < 10 ? '0' + m : m;
  return h + ':' + m;
}

onMounted(() => {
  chartData.value = setChartData();
  chartOptions.value = setChartOptions();
});

const chartData = ref();
const chartOptions = ref();

const setChartData = () => {
  const documentStyle = getComputedStyle(document.body);

  return {
    labels: ['Работал', "Отсутствовал"],
    datasets: [
      {
        data: [540, 325],
        backgroundColor: [documentStyle.getPropertyValue('--blue-500'), documentStyle.getPropertyValue('--yellow-500'), documentStyle.getPropertyValue('--green-500')],
        hoverBackgroundColor: [documentStyle.getPropertyValue('--blue-400'), documentStyle.getPropertyValue('--yellow-400'), documentStyle.getPropertyValue('--green-400')]
      }
    ]
  };
};

const setChartOptions = () => {
  const documentStyle = getComputedStyle(document.documentElement);
  const textColor = documentStyle.getPropertyValue('--text-color');

  return {
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
          color: textColor
        }
      }
    }
  };
};

function getChartOptions(date) {
  if (date.notExisted.hours === 0 && date.notExisted.minutes === 0) {
    return [(date.worked.hours * 60) + +date.worked.minutes, 0]; // todo genius

  }
  if (date.worked && date.notExisted) {
    return [+date.worked.hours * 60 + +date.worked.minutes,
      date.notExisted.hours * 60 + date.notExisted.minutes];
  }
  return [1000, 0];
}

function getEvents(data) {
  return data.map(d => {
    return {
      status: d.type,
      date: d.time,
      icon: d.type === 'ВХОД' ? 'pi pi-sign-in' : 'pi pi-sign-out',
      rest: d
    }
  })
}

// function transformIntoTwoDigits(date){
//   return new Date(0, 0, 0, date.split(':')[0], date.split(':')[1]).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
// }

const router = useRouter();

function transformDataToHuman(data) {
  return `${Math.abs(data.hours)} часов (а) ${Math.abs(data.minutes)} минут`;
}

const confirmUploadNew = (event) => {
  confirm.require({
    target: event.currentTarget,
    message: 'К текущему отчету можно будет вернуться через меню выбора отчета.<br/> Вы уверены, что хотите загрузить новый отчет?',
    rejectLabel: 'Нет',
    acceptLabel: 'Да',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      router.push('/create');
    },
  });
};

const visible = ref(false);

async function getLastReports() {
  return (await axios.get(`${api}/docs`)).data;
}

function transformReportName(report: string, prefix: string) {
  const date = +report.split('.')[0];
  if (isFinite(date)) return `${prefix} ${new Date(+report.split('.')[0]).toLocaleString()}`;
  return report;
}

const toast = useToast();
const items = ref([
  {
    label: 'Установить по умолчанию',
    icon: 'pi pi-star',
    command: async (e) => {
      console.log(e)
      toast.add({severity: 'info', summary: 'Ура!', detail: 'Отчет установлен по умолчанию'});
    }
  },
  {
    label: 'Update',
    icon: 'pi pi-refresh',
    command: () => {
      toast.add({severity: 'success', summary: 'Update', detail: 'Data Updated'});
    }
  },
  {
    label: 'Delete',
    icon: 'pi pi-trash',
    command: (e) => {
      toast.add({severity: 'error', summary: 'Delete', detail: 'Data Deleted'});
    }
  },
]);

const confirmNew = () => {
  confirm.require({
    message: 'Вы поменяли основной отчет. Хотите сейчас перезагрузить страницу и увидеть его? К текущему можно вернуться через меню',
    header: 'Ура!',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Перезагружу позже',
    acceptLabel: 'Да',
    accept: () => {
      router.push('/')
      window.location.reload();
    },
    reject: () => {
    }
  });
};

async function makePrimary(name) {
  const res = await axios.post(`${api}/primary`, {name: name});
  confirmNew();
}
</script>

<template>
  <ConfirmDialog></ConfirmDialog>
  <div class="p-2">
    <Sidebar v-model:visible="visible">
      <template #container="{ closeCallback }">
        <div class="flex flex-column h-full">
          <div class="flex align-items-center justify-content-between px-4 pt-3 flex-shrink-0">
            <span class="inline-flex align-items-center gap-2">
              <img src="/logo.svg" style="height: 24px"/>
            </span>
            <span>
              <Button type="button" @click="closeCallback" icon="pi pi-times" rounded outlined
                      class="h-2rem w-2rem"></Button>
            </span>
          </div>
          <div class="overflow-y-auto">
            <ul class="list-none p-3 m-0">
              <li>
                <div
                    v-ripple
                    v-styleclass="{
                                        selector: '@next',
                                        enterClass: 'hidden',
                                        enterActiveClass: 'slidedown',
                                        leaveToClass: 'hidden',
                                        leaveActiveClass: 'slideup'
                                    }"
                    class="p-3 flex align-items-center justify-content-between text-600 cursor-pointer p-ripple"
                >
                  <span class="font-medium uppercase">Функции</span>
                  <i class="pi pi-chevron-down"></i>
                </div>
                <ul class="list-none p-0 m-0 overflow-hidden">
                  <li>
                    <a v-ripple
                       href="/"
                       class="flex align-items-center cursor-pointer p-3 border-round text-700 hover:surface-100 transition-duration-150 transition-colors p-ripple">
                      <i class="pi pi-home mr-2"></i>
                      <span class="font-medium">Домашняя</span>
                    </a>
                  </li>
                  <li>
                    <a v-ripple
                       href="/create"
                       class="flex align-items-center cursor-pointer p-3 border-round text-700 hover:surface-100 transition-duration-150 transition-colors p-ripple">
                      <i class="pi pi-cloud-upload mr-2"></i>
                      <span class="font-medium">Загрузить отчет</span>
                    </a>
                  </li>
                  <li>
                    <a
                        v-ripple
                        v-styleclass="{
                                                selector: '@next',
                                                enterClass: 'hidden',
                                                enterActiveClass: 'slidedown',
                                                leaveToClass: 'hidden',
                                                leaveActiveClass: 'slideup'
                                            }"
                        class="flex align-items-center cursor-pointer p-3 border-round text-700 hover:surface-100 transition-duration-150 transition-colors p-ripple"
                    >
                      <i class="pi pi-folder mr-2"></i>
                      <span class="font-medium">Другие отчеты</span>
                      <i class="pi pi-chevron-down ml-auto"></i>
                    </a>
                    <ul class="list-none py-0 pl-0 pr-0 m-0 mt-3 hidden overflow-y-hidden transition-all transition-duration-400 transition-ease-in-out">
                      <li class="mb-5 relative border-1 border-gray-600 p-1" v-for="report in reports"
                          :key="report.name">
                        <span class="font-medium overflow-visible">
                          Отчет <span v-html="transformReportName(report.name, 'загружен <br/>')"></span>
                        </span>
                        <a v-ripple :href="`?report=${ report.name }`"
                           :class="{'p-disabled': info.reportName === report.name}"
                           class="flex align-items-center cursor-pointer p-3 border-round text-700 hover:surface-100 transition-duration-150 transition-colors p-ripple">
                          <i class="pi pi-file-pdf mr-2"></i>
                          <span class="font-medium">{{ report.name }}</span>
                        </a>
                        <Button class="ml-auto absolute right-0 top-0" icon="pi pi-star"
                                v-tooltip="'Установить отчет по умолчанию'" @click="makePrimary(report.name)"/>
                        <!--                        <SpeedDial :tooltipOptions="{ position: 'left' }"-->
                        <!--                                   class="relative w-2rem h-2rem ml-auto" @click.prevent :model="items"-->
                        <!--                                   :radius="120" direction="down-left" type="quarter-circle"-->
                        <!--                                   buttonClass="p-button-warning">-->
                        <!--                        </SpeedDial>-->
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
          <div class="mt-auto">
            <hr class="mb-3 mx-3 border-top-1 border-none surface-border"/>
            <a target="_blank" href="https://github.com/rxMATTEO/rtf-parser" v-ripple
               class="m-3 flex align-items-center just cursor-pointer p-3 gap-2 border-round text-700 hover:surface-100 transition-duration-150 transition-colors p-ripple">
              <i class="pi pi-github"/>
              <span class="font-bold">Github</span>
              <i class="pi pi-star-fill ml-auto"/>
            </a>
          </div>
        </div>
      </template>
    </Sidebar>
    <div class="flex justify-content-between align-items-center">
      <Button icon="pi pi-bars" @click="visible = true"/>
      <div v-if="error">
        {{ error }}
      </div>
      <a href="/" class="absolute" style="left: 100px">
        <img src="/logo.svg" style="height: 24px;"/>
      </a>
      <!--      <div>-->
      <!--        Имя отчета: {{ info.reportName }}-->
      <!--      </div>-->
      <div v-if="info" class="flex gap-5 justify-content-between">
        <p>Период: {{ info.dates }}</p>
        <p>Сотрудников: {{ people?.length }}</p>
        <p>Рабочих дней: {{ info.workDays }}</p>
        <p>{{ info.creationDate.split(' ').slice(0, 2).join(' ') + info.creationDate.split(' ')[2] + ':' + info.creationDate.split(' ').slice(3).join(' ') }}</p>
      </div>
      <!--      <div>-->
      <!--        Время: {{ info.time }}-->
      <!--      </div>-->
      <div>
        <a href="/create">
          <Button icon="pi pi-cloud-upload" label="Загрузить отчет"></Button>
        </a>
      </div>
    </div>
  </div>

  <DataTable v-model:expandedRows="expandedPeople" tableStyle="max-width: 100vw" :selectionMode="'single'"
             :value="people" paginator :rows="people?.length" removableSort
             :rowsPerPageOptions="rowsPerPage" :loading="!people" showGridlines
             :filterDisplay="'row'" :globalFilterFields="['firstName', 'lastName', 'middleName']"
             scrollable scrollHeight="90vh"
             :pt="{
               rowExpansionCell: {
                 class: 'p-0'
               },
                       table: {
          style: {
            // 'table-layout': 'fixed'
          }
        }
             }"
  >
    <template #header>
      <div class="flex justify-content-end align-items-center gap-2">
        <!--        Глобальный поиск:-->
        <!--        <span class="p-input-icon-left">-->
        <!--                <i class="pi pi-search"/>-->
        <!--                <InputText v-model="filters['global'].value" placeholder="Поиск"/>-->
        <!--            </span>-->
        <Button text icon="pi pi-plus" label="Раскрыть все" @click="expandAll"/>
        <Button text icon="pi pi-minus" label="Свернуть все" @click="collapseAll"/>
      </div>
    </template>

    <Column expander style="width: 5rem"/>
    <Column v-for="[k,{header, field}] in Object.entries(columns)" :header="header" :field="field" sortable :key="k"
            :style="{width: '257px'}">
      <template #body="{data: {info: [event]}}" v-if="k === 'info'">
        <p>{{ event?.date || "" }} {{ event?.keyLabel || "" }} {{ event?.time || "" }} {{ event?.exit || "" }}
          {{ event?.type || "" }} {{ event?.pass || "" }} ...</p><!--empty cuz expander-->
      </template>
      <!--      <template #filter="{filterModel, filterCallback}">-->
      <!--        <InputText v-model="filterModel.value" type="text" @input="filterCallback()" class="p-column-filter"-->
      <!--                   :placeholder="`Искать по ${v}`"/>-->
      <!--      </template>-->
    </Column>

    <template #expansion="{ data: {info,dates} }">
      <DataTable :value="Object.entries(dates)" :pt="{
        table: {
          style: {
            // 'table-layout': 'fixed',
            'overflow': 'hidden'
          }
        },
        thead: {
          style: {
            display: 'none'
          }
        }
      }">
        <Column style="width: 79px; height: 34px">
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [date, data]}">
            {{ new Date(Date.parse(date)).toLocaleDateString() }}
          </template>
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [_, data]}">
            {{ `${formateDate(data).notExisted.hours} часов (а) ${formateDate(data).notExisted.minutes} минут` }}
          </template>
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [_, data]}">
            {{ `${formateDate(data).notExisted.hours} часов (а) ${formateDate(data).notExisted.minutes} минут` }}
          </template>
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [_, data]}">
            {{ transformDataToHuman(formateDate(data).worked) }}
          </template>
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [_, data]}">
            {{ `${formateDate(data).notExisted.hours} часов (а) ${formateDate(data).notExisted.minutes} минут` }}
          </template>
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [_, data]}">
            <p v-if="getResultFromDate(getDate(data[data.length - 1].time) - getDate('19:00')).hours < 0 && getResultFromDate(getDate(data[data.length - 1].time) - getDate('19:00')).minutes < 0">0 часов 0 минут</p>
            <p v-else>{{ getResultFromDate(getDate(data[data.length - 1].time) - getDate("19:00")).hours }} часов {{ getResultFromDate(getDate(data[data.length - 1].time) - getDate("19:00")).minutes }} минут</p>
          </template>
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [_, data]}">
            <p>{{ formateDate(data).late.str }}</p>
          </template>
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [_, data]}">
            <p>{{ data.filter((date) => date.type === 'ВХОД').length }}</p>
          </template>
        </Column>
      </DataTable>
    </template>
  </DataTable>
</template>

<style>
.p-datatable-wrapper {
  overflow-x: hidden !important;
}

a:link {
  text-decoration: none;
}

a:visited {
  text-decoration: none;
}

a:hover {
  text-decoration: none;
}

a:active {
  text-decoration: none;
}

.p-speeddial-button.p-button.p-button-icon-only {
  width: 2rem;
  height: 2rem;
}

td:last-child {
  //width: 50px !important
}
td:nth-child(2) {
  width: 350px !important
}
</style>
