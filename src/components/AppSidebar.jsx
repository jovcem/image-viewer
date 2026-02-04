import { useState } from 'react';
import { FolderIcon, PanelLeftCloseIcon, PanelLeftIcon, LayersIcon, SplitIcon, ImageIcon, ChevronRightIcon, UploadIcon, CheckIcon, SettingsIcon, InfoIcon, PipetteIcon, EyeIcon, EyeOffIcon, BugIcon, HighlighterIcon, Columns2Icon, PaletteIcon, HistoryIcon } from 'lucide-react';
import { ShareButton } from './ShareButton';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ThemeToggle } from './ThemeToggle';
import { NewComparisonDialog } from './NewComparisonDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const bgOptions = [
  { id: 'default', label: 'Default', className: 'bg-background' },
  { id: 'black', label: 'Black', className: 'bg-black' },
  { id: 'white', label: 'White', className: 'bg-white' },
  { id: 'checked', label: 'Checked', className: 'bg-checked' },
  { id: 'grey', label: 'Grey', className: 'bg-neutral-500' },
  { id: 'bordered', label: 'Bordered', className: 'bg-black border-[24px] border-white' },
];

function BgOption({ option, isSelected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(option.id)}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
        isSelected && "bg-muted"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded border border-border shrink-0",
        option.id === 'checked' && "bg-checked",
        option.id === 'default' && "bg-background",
        option.id === 'black' && "bg-black",
        option.id === 'white' && "bg-white",
        option.id === 'grey' && "bg-neutral-500",
        option.id === 'bordered' && "bg-black border-2 border-white",
      )} />
      <span className="flex-1">{option.label}</span>
      {isSelected && <CheckIcon className="w-4 h-4 text-primary" />}
    </button>
  );
}

export function AppSidebar({
  folders,
  folderImages,
  localComparisons,
  currentFolder,
  onFolderSelect,
  loading,
  theme,
  onThemeToggle,
  viewMode,
  onViewModeChange,
  onNewComparison,
  bgOption,
  onBgOptionChange,
  showToolbar,
  onShowToolbarChange,
  colorPickerEnabled,
  onColorPickerToggle,
  sliderVisible,
  onSliderVisibleToggle,
  annotationsEnabled,
  onAnnotationsToggle,
  annotationsVisible,
  onAnnotationsVisibleToggle,
  onShare,
  shareEnabled,
  sharing,
  uploadProgress,
  onLoadParent,
}) {
  const { toggleSidebar, open } = useSidebar();
  const [openFolders, setOpenFolders] = useState({});

  const toggleFolder = (folder) => {
    setOpenFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border h-screen">
      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2">Image Viewer</SidebarGroupLabel>
          <div className="flex items-center gap-1 pb-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
            {/* View modes group */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onSliderVisibleToggle}
              className={cn("h-8 w-8 cursor-pointer", !sliderVisible && "opacity-50")}
              title={sliderVisible ? "Hide slider (show single image)" : "Show slider (compare mode)"}
            >
              <Columns2Icon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewModeChange(viewMode === 'predator' ? 'slider' : 'predator')}
              className={cn("h-8 w-8 cursor-pointer", viewMode !== 'predator' && "opacity-50")}
              title="Toggle predator heat map view (3)"
            >
              <BugIcon className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border mx-1 group-data-[collapsible=icon]:h-px group-data-[collapsible=icon]:w-4 group-data-[collapsible=icon]:my-1" />
            {/* Analysis tools group */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onColorPickerToggle}
              className={cn("h-8 w-8 cursor-pointer", !colorPickerEnabled && "opacity-50")}
              title={colorPickerEnabled ? "Disable color picker" : "Enable color picker"}
            >
              <PipetteIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAnnotationsToggle}
              className={cn("h-8 w-8 cursor-pointer", !annotationsEnabled && "opacity-50")}
              title={annotationsEnabled ? "Disable annotations (4)" : "Enable annotations (4)"}
            >
              <HighlighterIcon className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border mx-1 group-data-[collapsible=icon]:h-px group-data-[collapsible=icon]:w-4 group-data-[collapsible=icon]:my-1" />
            {/* Action group */}
            <ShareButton
              onShare={onShare}
              disabled={!shareEnabled}
              sharing={sharing}
              uploadProgress={uploadProgress}
            />
          </div>
          <div className="pt-1 pb-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <NewComparisonDialog onCreated={onNewComparison} />
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <>
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                </>
              ) : (
                <>
                  {/* Server folders */}
                  {folders.map((folder, index) => (
                    <Collapsible
                      key={folder}
                      open={openFolders[folder]}
                      onOpenChange={() => toggleFolder(folder)}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={currentFolder === folder}
                          onClick={() => onFolderSelect(folder)}
                          className="cursor-pointer"
                          tooltip={folder}
                        >
                          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <ChevronRightIcon className={cn(
                              "h-4 w-4 shrink-0 transition-transform cursor-pointer hover:text-foreground group-data-[collapsible=icon]:hidden",
                              openFolders[folder] && "rotate-90"
                            )} />
                          </CollapsibleTrigger>
                          <span className="hidden group-data-[collapsible=icon]:inline text-xs font-medium w-4 text-center">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="group-data-[collapsible=icon]:hidden">{folder}</span>
                        </SidebarMenuButton>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {folderImages[folder]?.map((image) => (
                              <SidebarMenuSubItem key={image.name}>
                                <SidebarMenuSubButton className="cursor-default">
                                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                  <span>{image.name}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                            {(!folderImages[folder] || folderImages[folder].length === 0) && (
                              <SidebarMenuSubItem>
                                <span className="text-xs text-muted-foreground px-2 py-1">
                                  No images found
                                </span>
                              </SidebarMenuSubItem>
                            )}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}

                  {/* Local comparisons (uploaded) */}
                  {localComparisons.map((comp, index) => (
                    <Collapsible
                      key={comp.id}
                      open={openFolders[comp.id]}
                      onOpenChange={() => toggleFolder(comp.id)}
                    >
                      <SidebarMenuItem>
                        <div className="flex items-center w-full group-data-[collapsible=icon]:justify-center">
                          <SidebarMenuButton
                            isActive={currentFolder === comp.id}
                            onClick={() => onFolderSelect(comp.id)}
                            className="cursor-pointer flex-1"
                            tooltip={comp.name}
                          >
                            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <ChevronRightIcon className={cn(
                                "h-4 w-4 shrink-0 transition-transform cursor-pointer hover:text-foreground group-data-[collapsible=icon]:hidden",
                                openFolders[comp.id] && "rotate-90"
                              )} />
                            </CollapsibleTrigger>
                            <span className="hidden group-data-[collapsible=icon]:inline text-xs font-medium w-4 text-center">
                              {String.fromCharCode(65 + folders.length + index)}
                            </span>
                            <UploadIcon className="h-3 w-3 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
                            {(() => {
                              const match = comp.name.match(/^(-\d+) (.+)$/);
                              if (match) {
                                return (
                                  <span className="group-data-[collapsible=icon]:hidden truncate">
                                    <span className="text-muted-foreground text-xs mr-1">{match[1]}</span>
                                    {match[2]}
                                  </span>
                                );
                              }
                              return <span className="group-data-[collapsible=icon]:hidden truncate">{comp.name}</span>;
                            })()}
                            {comp.parentId && (
                              <HistoryIcon
                                className="h-3 w-3 ml-auto shrink-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden"
                                title="Load previous version"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const match = comp.name.match(/^-(\d+) /);
                                  const currentDepth = match ? parseInt(match[1], 10) : 0;
                                  onLoadParent(comp.parentId, currentDepth + 1);
                                }}
                              />
                            )}
                          </SidebarMenuButton>
                        </div>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton className="cursor-default">
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                <span>{comp.images.A.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            {comp.images.B && (
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton className="cursor-default">
                                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                  <span>{comp.images.B.name}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}

                  {folders.length === 0 && localComparisons.length === 0 && (
                    <div className="py-6 flex flex-col items-center gap-3 group-data-[collapsible=icon]:hidden">
                      <div className="rounded-full bg-muted/50 p-3">
                        <LayersIcon className="h-5 w-5 text-muted-foreground/60" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">No comparisons yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Drop images or use + to start</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex flex-col gap-1 group-data-[collapsible=icon]:items-center">
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Settings</span>
          <Collapsible open={openFolders['bg-options']} onOpenChange={() => toggleFolder('bg-options')}>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8 cursor-pointer", openFolders['bg-options'] && "bg-accent")}
                  title="Background options"
                >
                  <PaletteIcon className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <ThemeToggle theme={theme} onToggle={onThemeToggle} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onShowToolbarChange(!showToolbar)}
                className={cn("h-8 w-8 cursor-pointer", !showToolbar && "opacity-50")}
                title={showToolbar ? "Hide info toolbar" : "Show info toolbar"}
              >
                <InfoIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onAnnotationsVisibleToggle}
                className={cn("h-8 w-8 cursor-pointer", !annotationsVisible && "opacity-50")}
                title={annotationsVisible ? "Hide annotations" : "Show annotations"}
              >
                <LayersIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 cursor-pointer"
              >
                {open ? (
                  <PanelLeftCloseIcon className="h-4 w-4" />
                ) : (
                  <PanelLeftIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            <CollapsibleContent>
              <div className="py-1 flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                {bgOptions.map(option => (
                  <BgOption
                    key={option.id}
                    option={option}
                    isSelected={bgOption === option.id}
                    onSelect={onBgOptionChange}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
