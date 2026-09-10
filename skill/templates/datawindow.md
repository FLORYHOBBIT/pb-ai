# DataWindow 对象源码模板

文件路径: `pb_ai_src/<pbl名>/d_test.srd`

```powerbuilder
$PBExportHeader$d_test2.srd
release 12.5;
datawindow(units=0 timer_interval=0 color=1073741824 processing=1 HTMLDW=no print.printername="" print.documentname="" print.orientation = 0 print.margin.left = 110 print.margin.right = 110 print.margin.top = 96 print.margin.bottom = 96 print.paper.source = 0 print.paper.size = 0 print.canusedefaultprinter=yes print.prompt=no print.buttons=no print.preview.buttons=no print.cliptext=no print.overrideprintjob=no print.collate=yes hidegrayline=no grid.lines=0 )
header(height=92 color="536870912" )
summary(height=0 color="536870912" )
footer(height=0 color="536870912" )
detail(height=104 color="536870912" )
table(column=(type=long update=yes updatewhereclause=yes key=yes name=id dbname="test1.id" )
 column=(type=char(20) update=yes updatewhereclause=yes name=name dbname="test1.name" )
 column=(type=decimal(2) update=yes updatewhereclause=yes name=price dbname="test1.price" )
 retrieve="PBSELECT(TABLE(NAME=~"test1~") COLUMN(NAME=~"test1.id~")COLUMN(NAME=~"test1.name~")COLUMN(NAME=~"test1.price~"))" update="test1" updatewhere=1 updatekeyinplace=no )
text(band=header alignment="2" text="Id" border="0" color="33554432" x="9" y="8" height="76" width="384" html.valueishtml="0"  name=id_t visible="1"  font.face="Arial" font.height="-12" font.weight="400"  font.family="2" font.pitch="2" font.charset="0" background.mode="1" background.color="536870912" )
text(band=header alignment="2" text="姓名" border="0" color="33554432" x="402" y="8" height="76" width="672" html.valueishtml="0"  name=name_t visible="1"  font.face="Arial" font.height="-12" font.weight="400"  font.family="2" font.pitch="2" font.charset="0" background.mode="1" background.color="536870912" )
text(band=header alignment="2" text="价格" border="0" color="33554432" x="1083" y="8" height="76" width="384" html.valueishtml="0"  name=price_t visible="1"  font.face="Arial" font.height="-12" font.weight="400"  font.family="2" font.pitch="2" font.charset="0" background.mode="1" background.color="536870912" )
column(band=detail id=1 alignment="1" tabsequence=10 border="0" color="33554432" x="9" y="8" height="88" width="384" format="[general]" html.valueishtml="0"  name=id visible="1" edit.limit=0 edit.case=any edit.focusrectangle=no edit.autoselect=yes edit.autohscroll=yes edit.imemode=0  font.face="Arial" font.height="-12" font.weight="400"  font.family="2" font.pitch="2" font.charset="0" background.mode="1" background.color="536870912" )
column(band=detail id=2 alignment="0" tabsequence=20 border="0" color="33554432" x="402" y="8" height="88" width="672" format="[general]" html.valueishtml="0"  name=name visible="1" edit.limit=20 edit.case=any edit.focusrectangle=no edit.autoselect=yes edit.autohscroll=yes edit.imemode=0  font.face="Arial" font.height="-12" font.weight="400"  font.family="2" font.pitch="2" font.charset="0" background.mode="1" background.color="536870912" )
column(band=detail id=3 alignment="1" tabsequence=30 border="0" color="33554432" x="1083" y="8" height="88" width="384" format="[general]" html.valueishtml="0"  name=price visible="1" edit.limit=0 edit.case=any edit.focusrectangle=no edit.autoselect=yes edit.autohscroll=yes edit.imemode=0  font.face="Arial" font.height="-12" font.weight="400"  font.family="2" font.pitch="2" font.charset="0" background.mode="1" background.color="536870912" )
htmltable(border="1" )
htmlgen(clientevents="1" clientvalidation="1" clientcomputedfields="1" clientformatting="0" clientscriptable="0" generatejavascript="1" encodeselflinkargs="1" netscapelayers="0" )
export.xml(headgroups="1" includewhitespace="0" metadatatype=0 savemetadata=0 )
import.xml()
export.pdf(method=0 distill.custompostscript="0" xslfop.print="0" )
```

