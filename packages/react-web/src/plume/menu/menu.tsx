import { useMenu as useAriaMenu } from "@react-aria/menu";
import { useTreeState } from "@react-stately/tree";
import { AriaMenuProps } from "@react-types/menu";
import {
  AriaLabelingProps,
  DOMProps,
  FocusStrategy,
} from "@react-types/shared";
import * as React from "react";
import { mergeProps, pick } from "../../common";
import { Overrides } from "../../render/elements";
import {
  deriveItemsFromChildren,
  extractDisabledKeys,
  renderAsCollectionChild,
  renderCollectionNode,
} from "../collection-utils";
import {
  AnyPlasmicClass,
  getStyleProps,
  mergeVariantToggles,
  noOutline,
  PlasmicClassArgs,
  PlasmicClassOverrides,
  PlasmicClassVariants,
  StyleProps,
  useForwardedRef,
} from "../plume-utils";
import { MenuContext } from "./context";
import { BaseMenuGroupProps } from "./menu-group";
import { BaseMenuItemProps } from "./menu-item";

export interface BaseMenuProps extends DOMProps, AriaLabelingProps, StyleProps {
  /**
   * List of `Menu.Item`s or `Menu.Group`s that make up the menu
   */
  children?: React.ReactNode;

  /**
   * Called with the value or key of a `Menu.Item` when it is selected.
   */
  onAction?: (key: string) => void;

  /**
   * Called when the menu is closed.
   */
  onClose?: () => void;

  /**
   * Provides a ref to the ul element of the menu list
   */
  menuListRef?: React.Ref<HTMLUListElement>;

  /**
   * Whether menu should receive focus on render
   */
  autoFocus?: boolean | FocusStrategy;
}

export type MenuRef = React.Ref<HTMLElement>;

type AriaItemType =
  | React.ReactElement<BaseMenuItemProps>
  | React.ReactElement<BaseMenuGroupProps>;

const COLLECTION_OPTS = {
  itemPlumeType: "menu-item",
  sectionPlumeType: "menu-group",
};

export interface MenuConfig<C extends AnyPlasmicClass> {
  itemsSlot: keyof PlasmicClassArgs<C>;
  itemsContainer: keyof PlasmicClassOverrides<C>;
  root: keyof PlasmicClassOverrides<C>;
}

/**
 * Converts props from BaseMenuProps to react-aria's useMenu() props.
 */
function asAriaMenuProps(props: BaseMenuProps) {
  const { children, ...rest } = props;
  const items = deriveItems(children);
  const disabledKeys = extractDisabledKeys(items, COLLECTION_OPTS);

  const renderAsAriaCollectionChild = (child: AriaItemType) => {
    return renderAsCollectionChild(child, {
      ...COLLECTION_OPTS,
      deriveItems,
    });
  };
  return {
    ariaProps: {
      ...rest,
      children: renderAsAriaCollectionChild,
      items,
      disabledKeys,
    } as AriaMenuProps<any>,
  };
}

export function useMenu<P extends BaseMenuProps, C extends AnyPlasmicClass>(
  plasmicClass: C,
  props: P,
  config: MenuConfig<C>,
  ref: MenuRef = null
) {
  const { ariaProps } = asAriaMenuProps(props);
  const state = useTreeState(ariaProps);

  const { ref: menuListRef, onRef: menuListOnRef } = useForwardedRef(
    props.menuListRef
  );

  const { menuProps } = useAriaMenu(ariaProps, state, menuListRef);

  const contextValue = React.useMemo(() => ({ state, menuProps: props }), [
    state,
    props,
  ]);

  const variants = {
    ...pick(props, ...plasmicClass.internalVariantProps),
    ...mergeVariantToggles(),
  };

  const overrides: Overrides = {
    [config.root]: {
      props: mergeProps(getStyleProps(props), {
        ref,
      }),
    },
    [config.itemsContainer]: {
      as: "ul",
      props: mergeProps(menuProps, {
        ref: menuListOnRef,
        style: {
          ...noOutline(),
        },
      }),
    },
  };

  const args = {
    ...pick(props, ...plasmicClass.internalArgProps),
    [config.itemsSlot]: (
      <MenuContext.Provider value={contextValue}>
        {Array.from(state.collection).map((node) => renderCollectionNode(node))}
      </MenuContext.Provider>
    ),
  };

  return {
    plasmicProps: {
      variants: variants as PlasmicClassVariants<C>,
      args: args as PlasmicClassArgs<C>,
      overrides: overrides as PlasmicClassOverrides<C>,
    },
  };
}

function deriveItems(children: React.ReactNode) {
  return deriveItemsFromChildren<AriaItemType>(children, {
    ...COLLECTION_OPTS,
    invalidChildError: `Can only use Menu.Item and Menu.Group as children to Menu`,
  });
}
