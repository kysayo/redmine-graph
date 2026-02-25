import { useMemo } from 'react'
import { ComboChart } from './components/ComboChart'
import { PieChart } from './components/PieChart'
import { readConfig } from './utils/config'
import { parseRedmineFilter } from './utils/urlParser'
import { generateComboDummyData, generatePieDummyData } from './utils/dummyData'

interface Props {
  container: HTMLElement
}

export function App({ container }: Props) {
  const config = useMemo(() => readConfig(container), [container])
  const filter = useMemo(() => parseRedmineFilter(), [])

  const comboData = useMemo(() => generateComboDummyData(filter), [filter])
  const pieData = useMemo(() => generatePieDummyData(config.pieGroupBy), [config.pieGroupBy])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px' }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>チケット推移</h2>
      <ComboChart data={comboData} config={config} />

      <h2 style={{ fontSize: 16, margin: '24px 0 12px' }}>チケット割合</h2>
      <PieChart data={pieData} groupBy={config.pieGroupBy} />
    </div>
  )
}
