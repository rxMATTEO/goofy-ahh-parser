<script setup lang="ts">
import axios from "axios";
import {computed, inject, onMounted, Ref, ref} from "vue";
import {FilterMatchMode} from "primevue/api";
import {useConfirm} from "primevue/useconfirm";
import {useRouter} from "vue-router";
import {median} from "../stuff/median.ts";
import avg from "../stuff/avg.ts";
import late from "../stuff/late.ts";

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

const api = inject('apiUrl');

onMounted(async () => {
  try {
    body.value = (await axios.get(`${api}/ping`)).data;
  } catch {
    error.value = 'Не удалось подключиться к серверу. Попробуй его запустить: npm run server';
  }
  info.value = (await axios.get(`${api}/info`)).data;
  console.log(((await axios.get(`${api}/people`)).data));
  people.value = (((await axios.get(`${api}/people`)).data) as Person[]).map(
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

  // todo parse dates correctly
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
      chel.median = normilizeDate(convertMinsToHrsMins(median(chel.fullFormatted.map(el => (el.notExisted.hours) * 60 + el.notExisted.minutes)))).str;
      chel.avg = normilizeDate(convertMinsToHrsMins(avg(chel.fullFormatted.map(el => (el.notExisted.hours) * 60 + el.notExisted.minutes)).toFixed(0))).str;
      chel.lateTimes = (late(Object.entries(chel.dates).map(([date, data]) => {
        return normilizeDate(data[0].time);
      })));
      // chel.late = normilizeDate(convertMinsToHrsMins(late() );
      chel.fullInfo = getStatsForAll(chel.dates);
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
    late: {
      header: "Опоздал, раз",
      field: 'lateTimes',
    },
    entranceQuantity: {
      header: 'Вошел, раз',
      field: 'todo'
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
    overworked: getResultFromDate(getDate(lastExit) - getDate("18:00")),
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
    message: 'После загрузки нового документа, текущие данные будут перезаписаны. <br> Ты точно хочешь продолжить?',
    rejectLabel: 'Нет',
    acceptLabel: 'Да',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      router.push('/create');
    },
  });
};
</script>

<template>
  <div class="p-2">
    <div v-if="error">
      {{ error }}
    </div>
    <div v-if="info" class="flex justify-content-between align-items-center">
      <img src="/logo.svg" style="height: 24px"/>
      <div>
        Рабочих дней: {{ info.workDays }}
      </div>
      <div>
        {{ `Отчет создан: ${info.creationDate.split(' ')[2]} ${info.creationDate.split(' ')[3]}` }}
      </div>
      <div>
        Период : {{ info.dates }}
      </div>
      <div>
        Время: {{ info.time }}
      </div>

      <div>
        Сотрудников: {{ people.length }}
      </div>

      <div>
        <ConfirmPopup>
          <template #message="{ message: { message } }">
            <div class="p-3">
              <p v-html="message"></p>
            </div>
          </template>
        </ConfirmPopup>
        <Button @click="confirmUploadNew($event)">Загрузить отчет</Button>
      </div>
    </div>
  </div>

  <DataTable v-model:expandedRows="expandedPeople" tableStyle="max-width: 100vw"
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
            'table-layout': 'fixed'
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
            'table-layout': 'fixed',
            'overflow': 'hidden'
          }
        }
      }">
        <Column style="width: 79px; height: 34px">
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [date, data]}">
            {{ date }}
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
            <p>{{ formateDate(data).late.str }}</p>
          </template>
        </Column>
        <Column :style="{width: `257px`}">
          <template #body="{data: [_, data]}">
            <p>{{ data.filter( (date) => date.type === 'ВХОД' ).length }}</p>
          </template>
        </Column>
      </DataTable>
      <!--      <Tabview :scrollable="true" style="width: 95vw" :pt="{-->
      <!--        nextButton: 'bg-primary',-->
      <!--        previousButton: 'bg-primary',-->
      <!--      }">-->
      <!--        <Tabpanel header="ЗА ВЕСЬ ПЕРИОД">-->
      <!--          <div class="flex justify-content-between">-->
      <!--&lt;!&ndash;            <p>{{ getStatsForAll(dates).late.str }}</p>&ndash;&gt;-->
      <!--            <p>Работал: {{ getStatsForAll(dates).worked.hours }} часов(а) {{getStatsForAll(dates).worked.minutes}} минут</p>-->
      <!--            <p v-if="getStatsForAll(dates).notExisted">Отсутствовал:-->
      <!--              {{-->
      <!--                `${getStatsForAll(dates).notExisted.hours} часов(а) ${getStatsForAll(dates).notExisted.minutes} минут`-->
      <!--              }}-->
      <!--            </p>-->
      <!--            <p v-else>Не выходил</p>-->

      <!--            <div class="card flex justify-content-center">-->
      <!--              <Chart type="pie" :data="{-->
      <!--                  labels: ['Работал (минут)', 'Отсутствовал (минут)'],-->
      <!--                  datasets: [-->
      <!--                      {-->
      <!--                        data: getChartOptions(getStatsForAll(dates)),-->
      <!--                        backgroundColor: ['#00FF69FF', '#FF0045FF'],-->
      <!--                        hoverBackgroundColor: '#00C2FFFF'-->
      <!--                      }-->
      <!--                      ]-->
      <!--                }" :options="chartOptions" class="w-full md:w-30rem"/>-->
      <!--            </div>-->
      <!--          </div>-->

      <!--          <Accordion :activeIndex="-1" class="mt-5">-->
      <!--            <AccordionTab header="Все события по текущей дате" :pt="{-->
      <!--              headerAction: {-->
      <!--                class: 'bg-primary-800'-->
      <!--              },-->
      <!--              content: {-->
      <!--                class: 'surface-100'-->
      <!--              }-->
      <!--            }">-->
      <!--              <div v-for="infoItem in info">-->
      <!--                <p v-for="[k,v] in Object.entries(infoItem)">-->
      <!--                  <span class="text-primary-500 font-bold">{{ eventTypeMatch(k) }}: </span>-->
      <!--                  <span v-if="k === 'keyLabel' || k === 'pass'">{{ `${infoItem.keyLabel} ${infoItem.pass}` }}</span>-->
      <!--                  <span v-else>{{ v }}</span>-->
      <!--                </p>-->
      <!--                <Divider/>-->
      <!--              </div>-->
      <!--            </AccordionTab>-->
      <!--          </Accordion>-->
      <!--        </Tabpanel>-->
      <!--        <Tabpanel v-for="[date, data] in Object.entries(dates)" :header="date" contentStyle="width: 95vw">-->
      <!--          <div class="flex justify-content-between">-->
      <!--            <p>Вошел: {{ formateDate(data).enter }}</p>-->
      <!--            <p>Вышел: {{ formateDate(data).exit }}</p>-->
      <!--            <p>{{ formateDate(data).late.str }}</p>-->
      <!--            <p>Работал: {{ transformDataToHuman(formateDate(data).worked) }}</p>-->
      <!--            <p v-if="formateDate(data).notExisted">Отсутствовал:-->
      <!--              {{ `${formateDate(data).notExisted.hours} часов (а) ${formateDate(data).notExisted.minutes} минут` }}</p>-->
      <!--            <p v-else>Не выходил</p>-->

      <!--            <div class="card flex justify-content-center">-->
      <!--              <Chart type="pie" :data="{-->
      <!--                  labels: ['Работал (минут)', 'Отсутствовал (минут)'],-->
      <!--                  datasets: [-->
      <!--                      {-->
      <!--                        data: getChartOptions(formateDate(data)),-->
      <!--                        backgroundColor: ['#00FF69FF', '#FF0045FF'],-->
      <!--                        hoverBackgroundColor: '#00C2FFFF'-->
      <!--                      }-->
      <!--                      ]-->
      <!--                }" :options="chartOptions" class="w-full md:w-30rem"/>-->
      <!--            </div>-->
      <!--          </div>-->

      <!--          <Timeline :value="getEvents(data)" align="alternate" class="customized-timeline">-->
      <!--            <template #marker="slotProps">-->
      <!--                <span-->
      <!--                    class="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle z-1 shadow-1"-->
      <!--                    :style="{ backgroundColor: slotProps.item.color }">-->
      <!--                    <i :class="slotProps.item.icon"></i>-->
      <!--                </span>-->
      <!--            </template>-->
      <!--            <template #content="slotProps">-->
      <!--              <Card class="mt-3 surface-200">-->
      <!--                <template #title>-->
      <!--                  {{ slotProps.item.status }}-->
      <!--                </template>-->
      <!--                <template #subtitle>-->
      <!--                  {{ slotProps.item.date }}-->
      <!--                </template>-->
      <!--                <template #content>-->
      <!--                  &lt;!&ndash;                    <img v-if="slotProps.item.image" :src="`https://primefaces.org/cdn/primevue/images/product/${slotProps.item.image}`" :alt="slotProps.item.name" width="200" class="shadow-1" />&ndash;&gt;-->
      <!--                  <p v-for="v in Object.values(slotProps.item.rest)">-->
      <!--                    {{ v }}-->
      <!--                  </p>-->

      <!--                  &lt;!&ndash;                    <Button label="Read more" text></Button>&ndash;&gt;-->
      <!--                </template>-->
      <!--              </Card>-->
      <!--            </template>-->
      <!--          </Timeline>-->

      <!--          <Accordion :activeIndex="-1" class="mt-5">-->
      <!--            <AccordionTab header="Все события по текущей дате" :pt="{-->
      <!--              headerAction: {-->
      <!--                class: 'bg-primary-800'-->
      <!--              },-->
      <!--              content: {-->
      <!--                class: 'surface-100'-->
      <!--              }-->
      <!--            }">-->
      <!--              <div v-for="infoItem in info.filter(i => i.date === date)">-->
      <!--                <p v-for="[k,v] in Object.entries(infoItem)">-->
      <!--                  <span class="text-primary-500 font-bold">{{ eventTypeMatch(k) }}: </span>-->
      <!--                  <span v-if="k === 'keyLabel' || k === 'pass'">{{ `${infoItem.keyLabel} ${infoItem.pass}` }}</span>-->
      <!--                  <span v-else>{{ v }}</span>-->
      <!--                </p>-->
      <!--                <Divider/>-->
      <!--              </div>-->
      <!--            </AccordionTab>-->
      <!--          </Accordion>-->
      <!--        </Tabpanel>-->
      <!--      </Tabview>-->
    </template>
  </DataTable>
</template>

<style>
.p-datatable-wrapper {
  overflow-x: hidden !important;
}
</style>
