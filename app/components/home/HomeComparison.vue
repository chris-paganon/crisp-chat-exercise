<script setup lang="ts">
import { Check, ChevronRight, X } from "lucide-vue-next";
import tabletMan from "@/assets/images/doubting/tablet-man-bun.png";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const providers = [
  { name: "Front", slug: "front" },
  { name: "Hiver", slug: "hiver" },
  { name: "Zendesk", slug: "zendesk" },
  { name: "Intercom", slug: "intercom" },
  { name: "Crisp", slug: "crisp" },
];
const values = [
  { name: "Value 1", supported: [false, false, false, false, true] },
  { name: "Value 2", supported: [false, false, false, true, true] },
  { name: "Value 3", supported: [false, false, true, true, true] },
  { name: "Value 4", supported: [true, true, true, true, true] },
];
const competitors = providers
  .map((provider, index) => ({ ...provider, index }))
  .filter(provider => provider.slug !== "crisp");
const crispIndex = providers.findIndex(provider => provider.slug === "crisp");
</script>

<template>
  <section
    aria-labelledby="comparison-title"
    class="px-6 pb-16 lg:px-8 lg:pb-24"
  >
    <div class="blue-gray-gradient relative mx-auto max-w-7xl rounded-2xl px-6 py-12 sm:rounded-3xl sm:px-8 lg:py-20">
      <div class="relative px-2 sm:px-12">
        <img
          :src="tabletMan"
          alt="A Crisp teammate sitting with a tablet."
          width="464"
          height="385"
          loading="lazy"
          class="mx-auto mb-8 h-auto w-full max-w-100 lg:absolute lg:-top-32 lg:-right-4 lg:mb-0 lg:w-116 lg:max-w-none xl:right-0"
        >
        <div class="relative lg:max-w-xl lg:pr-2 xl:max-w-2xl xl:pr-0">
          <h2
            id="comparison-title"
            class="text-subtitle text-blue-900 sm:text-title lg:text-5xl/14"
          >
            Still doubting ?<br>Here is why you should not
          </h2>
          <p class="mt-6 text-lg/7 text-muted-foreground">
            Crisp shared inbox software fits the best with your requirements. We've made it easy for your company to compare Crisp Inbox with other shared inbox solution provider to show you why Crisp is a perfect choice.
          </p>
          <div class="mt-10 flex flex-wrap gap-3">
            <Button as-child>
              <a href="https://crisp.chat/en/contact/">Ask a question</a>
            </Button>
            <Button
              as-child
              variant="secondary"
            >
              <a href="https://crisp.chat/en/demo/">Book a demo</a>
            </Button>
          </div>
        </div>
      </div>
      <Tabs
        default-value="front"
        class="mt-12 gap-5 lg:hidden"
      >
        <p class="font-medium text-secondary-foreground">
          Compare Crisp with
        </p>
        <TabsList
          aria-label="Choose a competitor to compare with Crisp"
          class="flex h-auto w-full snap-x snap-proximity justify-start gap-1 overflow-x-auto rounded-xl bg-primary/5 p-1 pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-1"
        >
          <TabsTrigger
            v-for="provider in competitors"
            :key="provider.slug"
            :value="provider.slug"
            class="min-h-11 flex-none basis-2/5 snap-start px-2 text-base data-[state=active]:text-primary sm:basis-auto"
          >
            {{ provider.name }}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          v-for="provider in competitors"
          :key="provider.slug"
          :value="provider.slug"
          class="rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
        >
          <table class="w-full table-fixed border-collapse text-base text-secondary-foreground">
            <caption class="sr-only">
              Crisp compared with {{ provider.name }}
            </caption>
            <colgroup><col class="w-3/10"><col class="w-3/10"><col class="w-2/5"></colgroup>
            <thead>
              <tr class="border-b border-primary/15">
                <th
                  scope="col"
                  class="px-2 py-5 text-left font-normal sm:px-4"
                >
                  <span class="sr-only">Feature</span>
                </th>
                <th
                  scope="col"
                  class="px-1 py-5 text-center text-lg font-medium text-primary sm:text-xl"
                >
                  Crisp
                </th>
                <th
                  scope="col"
                  class="px-1 py-5 text-center text-base font-medium text-foreground sm:text-xl"
                >
                  {{ provider.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="value in values"
                :key="value.name"
                class="border-b border-primary/15"
              >
                <th
                  scope="row"
                  class="px-2 py-4 text-left font-normal sm:px-4"
                >
                  {{ value.name }}
                </th>
                <td
                  v-for="index in [crispIndex, provider.index]"
                  :key="index"
                  class="px-1 py-4 text-center"
                >
                  <span :class="['inline-flex size-5 items-center justify-center rounded-full', value.supported[index] ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/40 text-primary-foreground']">
                    <component
                      :is="value.supported[index] ? Check : X"
                      aria-hidden="true"
                      class="size-3 stroke-3"
                    />
                    <span class="sr-only">{{ value.supported[index] ? 'Included' : 'Not included' }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-2 py-4 sm:px-4">
            <p class="text-sm text-secondary-foreground sm:text-base">
              See detailed comparison
            </p>
            <Button
              as-child
              variant="link"
              class="min-h-11"
            >
              <a
                :href="`https://crisp.chat/en/alternatives/${provider.slug}/`"
                :aria-label="`Compare Crisp with ${provider.name}`"
              >Learn more <ChevronRight aria-hidden="true" /></a>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      <div class="hidden lg:block">
        <Table class="mt-16 min-w-0 table-fixed text-sm text-secondary-foreground xl:min-w-282 xl:text-base">
          <TableHeader>
            <TableRow class="border-0 hover:bg-transparent">
              <TableHead class="w-1/4">
                <span class="sr-only">Feature</span>
              </TableHead>
              <TableHead
                v-for="provider in providers"
                :key="provider.slug"
                scope="col"
                class="border-b border-primary/15 px-0 py-5 text-lg font-medium text-foreground xl:text-xl"
              >
                {{ provider.name }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="value in values"
              :key="value.name"
              class="border-primary/15 hover:bg-transparent"
            >
              <TableCell class="p-4 text-lg xl:px-10">
                {{ value.name }}
              </TableCell>
              <TableCell
                v-for="(supported, index) in value.supported"
                :key="providers[index]!.slug"
                class="px-0 py-4"
              >
                <span :class="['inline-flex size-5 items-center justify-center rounded-full', supported ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/40 text-primary-foreground']">
                  <component
                    :is="supported ? Check : X"
                    aria-hidden="true"
                    class="size-3 stroke-3"
                  />
                  <span class="sr-only">{{ supported ? 'Included' : 'Not included' }}</span>
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableFooter class="border-primary/15 bg-transparent font-normal">
            <TableRow class="hover:bg-transparent">
              <TableCell class="px-4 py-5 text-base whitespace-nowrap xl:px-10 xl:text-lg">
                See detailed comparison
              </TableCell>
              <TableCell
                v-for="provider in providers"
                :key="provider.slug"
                class="px-0 py-5"
              >
                <Button
                  v-if="provider.slug !== 'crisp'"
                  as-child
                  variant="link"
                  class="text-base xl:text-lg"
                >
                  <a
                    :href="`https://crisp.chat/en/alternatives/${provider.slug}/`"
                    :aria-label="`Compare Crisp with ${provider.name}`"
                  >Learn more <ChevronRight aria-hidden="true" /></a>
                </Button>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  </section>
</template>
